import { FileText, ExternalLink } from 'lucide-react';
import { getHistoryChecklistPdfUrl, getHistoryChecklistLabel } from '../../lib/caseChecklistDocs';

/**
 * Renders the OSCE history checklist PDF for reference during evaluation.
 * Scoring uses the matching JSON checklist on the server; this is the source document.
 */
export function HistoryChecklistPdfPanel({ selectedCase, getCaseMockKey, className = '' }) {
  if (!selectedCase || !getCaseMockKey) return null;

  const mockKey = getCaseMockKey(selectedCase);
  const pdfUrl = getHistoryChecklistPdfUrl(selectedCase, mockKey);
  const label = getHistoryChecklistLabel(selectedCase, mockKey);

  return (
    <div className={`flex flex-col rounded-xl overflow-hidden bg-card border border-white/5 min-h-[320px] ${className}`}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={14} className="text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">OSCE reference checklist</p>
            <p className="text-[10px] text-muted-foreground truncate">{label}</p>
          </div>
        </div>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline shrink-0"
        >
          Open
          <ExternalLink size={10} />
        </a>
      </div>
      <iframe
        title={label}
        src={pdfUrl}
        className="flex-1 w-full min-h-[280px] border-0 bg-white/[0.03]"
      />
      <p className="px-3 py-2 text-[10px] text-muted-foreground border-t border-white/5 flex-shrink-0">
        AI scoring is based on this checklist. Use it to verify marks and give feedback.
      </p>
    </div>
  );
}

export default HistoryChecklistPdfPanel;
