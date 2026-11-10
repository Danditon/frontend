// 장식 효과만 담당하며, 실제 검증 완료 여부는 서버 응답으로 판단합니다.
export default function PhotoScanner() {
  return (
    <div className="qv-scanner" aria-hidden="true">
      <div className="qv-scan-sweep">
        <span className="qv-scan-trail qv-scan-trail-down" />
        <span className="qv-scan-trail qv-scan-trail-up" />
      </div>
      <div className="qv-scan-corners">
        <i /><i /><i /><i />
      </div>
    </div>
  );
}
