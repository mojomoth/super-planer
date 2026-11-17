import { BASE } from '@/lib/base';

export default function NotFound() {
  return (
    <div className="empty">
      <p>찾는 페이지가 없어요. 주소가 잘못됐거나 지워졌어요.</p>
      <a className="btn" href={BASE}>기획서 첫 화면으로</a>
    </div>
  );
}
