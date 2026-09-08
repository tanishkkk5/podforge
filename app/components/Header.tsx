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
        </nav>
      </div>
    </div>
  );
}
