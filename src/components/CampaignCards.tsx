const previews = [
  { name: "Creator campaign preview", game: "Gaming · Short-form", color: "art-violet" },
  { name: "Studio launch preview", game: "Gaming · Social", color: "art-orange" },
  { name: "Community highlights", game: "Gaming · Clips", color: "art-blue" },
];

export function CampaignCards({ showPreview }: { showPreview: boolean }) {
  if (!showPreview) {
    return <div className="empty-state"><h2>No active campaigns yet</h2><p>New opportunities will appear here when studios publish live campaigns.</p></div>;
  }

  return (
    <div className="campaign-grid">
      {previews.map((campaign) => (
        <article className="campaign-card" key={campaign.name}>
          <div className={`campaign-art ${campaign.color}`} />
          <div className="campaign-card-content">
            <div className="campaign-meta"><span>{campaign.game}</span><span className="status-pill">Preview</span></div>
            <h3>{campaign.name}</h3>
            <p>Campaign details will appear here when studios publish opportunities.</p>
            <div className="campaign-bottom"><span>Rate varies by campaign</span><span>Details →</span></div>
          </div>
        </article>
      ))}
    </div>
  );
}
