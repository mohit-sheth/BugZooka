document.addEventListener('DOMContentLoaded', () => {
  const slackBody = document.getElementById('hero-slack-body');
  if (!slackBody) return;

  const messages = [
    {
      avatar: 'PR', name: 'Prow CI', color: '#e53935', time: '10:42 AM',
      content: '<span class="slack-fail-badge">FAILURE</span> <a class="slack-link">periodic-ci-openshift-release-master-ci-4.22-e2e-aws-ovn-upgrade</a><br><span class="slack-job-meta">Job: e2e-aws-ovn-upgrade &middot; Duration: 1h 23m &middot; Build #14291</span>'
    },
    {
      avatar: 'BZ', name: 'BugZooka', color: '#ff9800', time: '10:42 AM', isBot: true,
      typing: 'Analyzing prow artifacts...',
      content: '<span class="slack-thread-indicator">Thread reply</span><br><strong>Category:</strong> Changepoint Failure &middot; <strong>Component:</strong> kube-apiserver<br><strong>Severity:</strong> <span class="slack-severity">High</span><br><strong>Root Cause:</strong> API server pods failed readiness probes during node scaling. etcd leader election timed out under load, causing <code>APIServerDegraded</code> alerts.<br><strong>Implication:</strong> Cluster upgrades on 4.22-ec2 affected. Similar failures in <a class="slack-link">OCPBUGS-42918</a>.'
    },
    {
      avatar: 'JD', name: 'jane.doe', color: '#1e88e5', time: '10:47 AM',
      content: '<span class="slack-mention">@BugZooka</span> inspect 4.22.0-0.nightly-2026-03-04-120925 for 15 days'
    },
    {
      avatar: 'BZ', name: 'BugZooka', color: '#ff9800', time: '10:48 AM', isBot: true,
      typing: 'Calling orion-mcp changepoint detection...',
      content: '<strong>Nightly Inspection: 4.22.0-0.nightly-2026-03-04</strong><br>Checked 12 configs over 15-day window<br>Changepoints found: <strong>2</strong><br><br><span class="slack-severity">Regression:</span> node-density-heavy P99 pod latency <span class="slack-metric-up">+8.3%</span><br><span class="slack-metric-down">Improvement:</span> cluster-density-v2 throughput <span class="slack-metric-down">-4.1%</span> (faster)<br><br>Full report: <a class="slack-link">View in Orion Dashboard</a>'
    },
  ];

  let msgIndex = 0;

  function showTyping(text, callback) {
    const typing = document.createElement('div');
    typing.className = 'slack-typing-row';
    typing.innerHTML = `
      <span class="slack-typing-dot"></span>
      <span class="slack-typing-dot"></span>
      <span class="slack-typing-dot"></span>
      <span class="slack-typing-label">${text}</span>
    `;
    slackBody.appendChild(typing);
    slackBody.scrollTop = slackBody.scrollHeight;
    setTimeout(() => {
      typing.remove();
      callback();
    }, 1200);
  }

  function addMessage() {
    if (msgIndex >= messages.length) {
      // #2: Empty state after all messages
      setTimeout(() => {
        const empty = document.createElement('div');
        empty.className = 'slack-empty-state';
        empty.innerHTML = 'No new failures detected. Suspicious... too suspicious. &#x1F50E;';
        slackBody.appendChild(empty);
        slackBody.scrollTop = slackBody.scrollHeight;
      }, 2000);
      return;
    }

    const msg = messages[msgIndex];

    function renderMessage() {
      const el = document.createElement('div');
      el.className = 'slack-message slack-message-enter';
      el.innerHTML = `
        <div class="slack-avatar" style="background: ${msg.color}">${msg.avatar}</div>
        <div class="slack-msg-content">
          <div class="slack-msg-header">
            <span class="slack-msg-name">${msg.name}</span>
            ${msg.isBot ? '<span class="slack-bot-badge">APP</span>' : ''}
            <span class="slack-msg-time">${msg.time}</span>
          </div>
          <div class="slack-msg-text">${msg.content}</div>
        </div>
      `;
      slackBody.appendChild(el);
      slackBody.scrollTop = slackBody.scrollHeight;
      requestAnimationFrame(() => el.classList.remove('slack-message-enter'));

      msgIndex++;
      setTimeout(addMessage, msg.isBot ? 1000 : 600);
    }

    // #9: Show typing indicator before bot messages
    if (msg.typing) {
      showTyping(msg.typing, renderMessage);
    } else {
      renderMessage();
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        setTimeout(addMessage, 600);
        observer.disconnect();
      }
    },
    { threshold: 0.3 }
  );
  observer.observe(slackBody);
});
