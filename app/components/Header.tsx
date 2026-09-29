export default function Header() {
  return (
    <div className="af-sidebar">
      <div className="af-sidebar-brand">
        <img src="/af-swoosh-icon.png" alt="Applied Frameworks" className="af-logo" />
        <span className="af-sidebar-title">PROFIT STREAMS® PODCAST</span>
      </div>

      <div className="af-nav-group">
        <p className="af-nav-group-label">Production</p>
        <nav className="af-nav">
          <a href="/">Guest Intake</a>
          <a href="/admin">Schedule Guest</a>
          <a href="/admin/submissions">New Submissions</a>
          <a href="/tools/transcript-check">Transcript Checker</a>
          <a href="/admin/upload-transcript">Upload Transcript</a>
          <a href="/tools/ask-archive">Ask Archive</a>
        </nav>
      </div>

      <div className="af-nav-group">
        <p className="af-nav-group-label">Guest Kit</p>
        <nav className="af-nav">
          <a href="/admin/guest-kit-generator">Guest Kit Generator</a>
        </nav>
      </div>
    </div>
  );
}
