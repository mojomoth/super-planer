export default function NotFound() {
  return (
    <div className="empty">
      <p>이 세션을 찾을 수 없어요. 지워졌거나 주소가 잘못됐어요.</p>
      <a className="btn" href="/">처음 화면으로</a>
    </div>
  );
}
