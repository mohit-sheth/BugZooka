import logging
import re
import subprocess
from bugzooka.core.constants import TOP_N_ERRROS
from typing import Iterable, Optional, Tuple
import requests

logger = logging.getLogger(__name__)


def extract_job_details(text: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract the job URL and job name from a Slack message.
    Handles Slack-style links and trailing emojis/punctuation.

    :param text: message text in Slack
    :return: (job_url, job_name) or (None, None) if not found
    """
    try:
        logger.info("Extracting job details from text: %s", text)
        # Convert Slack-style links <https://url|text> to plain URL
        text_for_url = re.sub(r"<(https://[^>|]+)\|[^>]+>", r"\1", text)

        # Match a URL until whitespace or non-URL-safe trailing chars
        url_pattern = re.compile(r"https://[^\s:_]+(?:/[^\s:_]*)*")
        url_match = url_pattern.search(text_for_url)

        # Match job name pattern like: "Job <name> ended"
        name_match = re.search(r"Job\s+\*?(.+?)\*?\s+ended", text_for_url, re.I)

        job_url: Optional[str] = url_match.group(0) if url_match else None
        job_name: Optional[str] = name_match.group(1) if name_match else None

        return job_url, job_name
    except Exception as e:
        logger.error("Failure in extracting job details: %s", e)
        return None, None


def run_shell_command(command):
    """
    Run a shell command and return the output lines.

    :param command: shell command to execute
    :return: command output
    """
    logger.info("Executing: %s", command)
    result = subprocess.run(
        command, shell=True, check=True, capture_output=True, text=True
    )
    return result.stdout.strip().splitlines()


def list_gcs_files(gcs_path):
    """
    List files in a GCS path.

    :param gcs_path: gcs path to list artifacts
    :return: list of artifacts
    """
    command = f"gsutil ls {gcs_path}"
    return run_shell_command(command)


def download_file_from_gcs(gcs_url, local_path):
    """
    Download a single file from GCS.

    :param gcs_url: gcs path to list artifacts
    :param local_path: local file system path to download
    :return: None
    """
    command = f"gsutil -m cp -r {gcs_url} {local_path}"
    file_name = gcs_url.strip("/").split("/")[-1]
    try:
        logger.info("Downloading %s...", file_name)
        subprocess.run(command, shell=True, check=True)
        logger.info("%s downloaded successfully.", file_name)
    except subprocess.CalledProcessError as e:
        logger.error("Error downloading %s: %s", file_name, e)


def extract_prow_test_phase(case_name):
    """
    Identifies the prow test phase.

    :param case_name: name of the case
    :return: phase
    """
    for keyword in ("pre", "post", "test"):
        if f"{keyword} phase" in case_name:
            return keyword
    return None


def extract_prow_test_name(case_name):
    """
    Extracts prow test name from a given string.

    :param case_name: name of the case
    :return: name of the test
    """
    match = re.search(r"(?<=-\s)(.+?)(?=\s+container)", case_name)
    return match.group(1) if match else None


def filter_most_frequent_errors(full_errors, frequent_errors):
    """
    Filters out the most recent errors from a full list.

    :param full_errors: full list of errors
    :param frequent_errors: frequent list of errors
    :return: most significant set of errors
    """
    frequency_map = {}
    for entry in frequent_errors:
        trimmed = entry.strip()
        parts = trimmed.split(" ", 1)
        if len(parts) == 2:
            frequency, message = parts
            if int(frequency) not in frequency_map:
                frequency_map[int(frequency)] = [message]
            else:
                frequency_map[int(frequency)].append(message)

    sorted_freqs = sorted(frequency_map.items(), key=lambda x: -x[0])

    top_errors_set = set()
    for _, errors in sorted_freqs:
        for e in errors:
            top_errors_set.add(e)
            if len(top_errors_set) >= TOP_N_ERRROS:
                break
        if len(top_errors_set) >= TOP_N_ERRROS:
            break
    top_error_patterns = [re.compile(re.escape(err)) for err in top_errors_set]
    top_errors_from_full = [
        e
        for e in full_errors
        if any(pattern.search(e) for pattern in top_error_patterns)
    ]
    return top_errors_from_full


def str_to_bool(value):
    """Convert string to bool."""
    return str(value).lower() == "true"


def to_job_history_url(view_url: str) -> str:
    """
    Convert a Prow 'view' URL to a 'job-history' URL.

    Rules:
    - Replace '/view/' with '/job-history/'
    - Remove the trailing run ID ('/<digits>')
    - Keep everything else intact
    """
    try:
        if "/view/" not in view_url:
            return view_url
        # Replace the first occurrence of '/view/' with '/job-history/'
        job_history = view_url.replace("/view/", "/job-history/", 1)
        # Remove trailing run id (digits) at the end of URL
        job_history = re.sub(r"/(\d+)$", "", job_history)
        return job_history
    except Exception:
        return view_url


def select_matching_job_message(
    messages: Iterable[dict],
    query_substr: str,
    exclude_ts: Optional[str] = None,
) -> Tuple[Optional[dict], Optional[str], Optional[str]]:
    """
    Given Slack messages, find the first one that:
    - (optionally) is not the current command/thread ts
    - contains the word 'job'
    - contains the query_substr (case-insensitive)
    - and from which we can extract a valid (view_url, job_name)

    Returns: (matched_message, view_url, job_name) or (None, None, None)
    """
    lowered_query = (query_substr or "").lower()
    for message in messages:
        text = message.get("text", "")
        ts_val = message.get("ts")
        if exclude_ts and ts_val == exclude_ts:
            continue
        text_lower = text.lower()
        if "job" not in text_lower:
            continue
        if lowered_query not in text_lower:
            continue
        view_url, job_name = extract_job_details(text)
        if view_url and job_name:
            return message, view_url, job_name
    return None, None, None


def fetch_job_history_stats(job_history_url: str) -> Tuple[int, int, int, str]:
    """
    Fetch the job history page and compute failure stats and a status emoji.

    Returns: (failure_count, total_count, failure_rate_percent, status_emoji)
    """
    failure_count = 0
    total_count = 0
    try:
        resp = requests.get(job_history_url, timeout=10)
        if resp.ok:
            page_html = resp.text
            failure_count = len(re.findall(r"FAILURE|Failure|failed", page_html))
            total_count = len(re.findall(r"ID", page_html))
    except Exception as e:
        logger.warning("Failed to fetch job history page: %s", e)

    failure_rate = int((failure_count / total_count * 100) if total_count else 0)
    if failure_rate == 0:
        status_emoji = ":large_green_circle:"
    elif failure_rate < 50:
        status_emoji = ":grey_exclamation:"
    elif failure_rate < 100:
        status_emoji = ":red_circle:"
    else:
        status_emoji = ":alert-siren:"
    return failure_count, total_count, failure_rate, status_emoji
