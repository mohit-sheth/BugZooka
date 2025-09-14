import logging
import os
import re
import threading
from typing import Tuple

from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

from bugzooka.core.config import (
    SLACK_BOT_TOKEN,
    SUMMARY_LOOKBACK_SECONDS,
    configure_logging,
    get_product_config,
)
from bugzooka.integrations.slack_fetcher import SlackMessageFetcher


# Configure logging early
configure_logging(os.getenv("LOG_LEVEL", "INFO").upper())
logger = logging.getLogger(__name__)


def _parse_lookback_and_verbose(text: str) -> Tuple[int, bool]:
    """
    Parse lookback window and verbosity from the slash command text.

    Supported formats:
      "" -> default SUMMARY_LOOKBACK_SECONDS
      "20m" | "1h" | "2d" with optional "verbose" suffix

    Returns: (lookback_seconds, verbose)
    """
    if not text:
        return SUMMARY_LOOKBACK_SECONDS, False

    text_norm = text.strip().lower()

    # Match patterns like: "20m", "1h", "2d", optionally followed by " verbose"
    m = re.fullmatch(r"(\d+)([mhd])(\s+verbose)?", text_norm)
    if not m:
        return SUMMARY_LOOKBACK_SECONDS, ("verbose" in text_norm)

    value, unit, verbose_suffix = m.group(1), m.group(2), m.group(3)
    factor = {"m": 60, "h": 3600, "d": 86400}[unit]
    lookback = int(value) * factor
    verbose = bool(verbose_suffix and verbose_suffix.strip())
    return lookback, verbose


def _ensure_required_env(var_name: str) -> str:
    value = os.getenv(var_name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {var_name}")
    return value


# Bolt app (Socket Mode; signing secret not required)
bolt_app = App(token=SLACK_BOT_TOKEN)


@bolt_app.command("/summarise")
def handle_summarise_command(ack, body, respond, logger):  # type: ignore[no-redef]
    """Slash command handler for /summarise.

    Accepts optional args like "20m verbose".
    """
    # Ack within 3 seconds
    text = (body or {}).get("text", "")
    lookback_seconds, verbose = _parse_lookback_and_verbose(text)

    # Human-readable window string
    window_str = f"last {text.strip()}" if text.strip() else "default window"
    ack(
        {
            "response_type": "ephemeral",
            "text": f"Starting summary for {window_str}. I'll post results here shortly.",
        }
    )

    # Kick off summarization in the background
    channel_id = (body or {}).get("channel_id")
    product = _ensure_required_env("PRODUCT").upper()
    ci = _ensure_required_env("CI").upper()
    product_config = get_product_config(product)

    def _run_summary() -> None:
        try:
            fetcher = SlackMessageFetcher(
                channel_id=channel_id, logger=logging.getLogger("bugzooka.slash")
            )
            fetcher.post_time_summary(
                product=product,
                ci=ci,
                product_config=product_config,
                lookback_seconds=lookback_seconds,
                verbose=verbose,
            )
        except Exception as e:  # Best-effort logging; errors won't block ack
            logger.error("/summarise failed: %s", e)
            try:
                respond(
                    {
                        "response_type": "ephemeral",
                        "text": f"Summary failed: {e}",
                    }
                )
            except Exception:
                pass

    threading.Thread(
        target=_run_summary, name="slash-summarise-worker", daemon=True
    ).start()


def main() -> None:
    app_token = _ensure_required_env("SLACK_APP_TOKEN")  # xapp-*
    logger.info("Starting Slack Socket Mode handler for slash commands")
    handler = SocketModeHandler(bolt_app, app_token)
    handler.start()


if __name__ == "__main__":
    main()
