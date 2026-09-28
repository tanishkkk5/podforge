export default function Header() {
  return (
    <div className="af-header">
      <div className="af-header-inner">
        <img src="/logo.png" alt="Applied Frameworks" className="af-logo" />
        <span className="af-header-title">PROFIT STREAMS® PODCAST</span>
        <nav className="af-nav">
          <a href="/">Guest Intake</a>
          <a href="/admin">Schedule Guest</a>
          <a href="/tools/transcript-check">Transcript Checker</a>
          <a href="/admin/upload-transcript">Upload Transcript</a>
          <a href="/tools/ask-archive">Ask Archive</a>
          <a href="/admin/guest-kit-generator">Guest Kit Generator</a>
        </nav>
      </div>
    </div>
  );
}
