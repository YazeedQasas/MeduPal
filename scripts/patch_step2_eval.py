from pathlib import Path

p = Path("src/components/dashboard/StudentPracticeFlow.jsx")
text = p.read_text(encoding="utf-8")

gate = """
                    if (isAssignedExam && examHistoryEvalChoice === null) {
                        return (
                            <div className="h-full flex flex-col items-center justify-center p-8">
                                <motion.div className="max-w-md w-full bg-card border border-white/10 rounded-2xl p-8 text-center space-y-5">
                                    <CheckCircle2 size={40} className="text-primary mx-auto" />
                                    <div>
                                        <h2 className="text-lg font-bold text-foreground">History evaluation</h2>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Do you want to view the AI evaluation and OSCE checklist reference now?
                                        </p>
                                    </motion.div>
                                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setExamHistoryEvalChoice('show');
                                                historyEvalDoneRef.current = false;
                                                runHistoryEvaluation();
                                            }}
                                            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground"
                                        >
                                            Yes, show evaluation
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setExamHistoryEvalChoice('skip')}
                                            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-muted/50 text-foreground border border-white/10"
                                        >
                                            Not now
                                        </button>
                                    </motion.div>
                                </motion.div>
                            </motion.div>
                        );
                    }

                    if (isAssignedExam && examHistoryEvalChoice === 'skip') {
                        return (
                            <div className="h-full flex flex-col">
                                <div className="flex-1 flex items-center justify-center p-8">
                                    <p className="text-sm text-muted-foreground text-center max-w-md">
                                        History evaluation deferred. Continue to the physical examination when ready.
                                    </p>
                                </motion.div>
                                <div className="flex-shrink-0 border-t border-white/5 px-6 py-4 flex justify-between">
                                    <button onClick={goBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-muted/50 border border-white/5">
                                        <ChevronLeft size={16} /> Back to history
                                    </button>
                                    <button onClick={goNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground">
                                        Continue to physical exam <ChevronRight size={16} />
                                    </button>
                                </motion.div>
                            </motion.div>
                        );
                    }

"""

gate = gate.replace("<motion.div", "<motion.div").replace("</motion.div>", "</motion.div>")
# clean all motion
import re
gate = re.sub(r"</?motion\.div", lambda m: m.group(0).replace("motion.", ""), gate)

marker = (
    '                    return (\n'
    '                        <div className="h-full flex flex-col">\n'
    '                            <div className="flex-1 flex overflow-hidden p-4 gap-4">\n'
    '                                {/* LEFT: Evaluation Content */}'
)
if marker not in text:
    raise SystemExit("marker not found")
text = text.replace(marker, gate + marker, 1)

old = (
    '                                    {/* Case title reveal */}\n'
    '                                    <motion.div className="pt-1 pb-2">'
)
if old not in text:
    old = (
        '                                    {/* Case title reveal */}\n'
        '                                    <div className="pt-1 pb-2">'
    )
new = (
    '                                    {/* Case title reveal */}\n'
    '                                    {!hideCaseIdentity && (\n'
    '                                    <div className="pt-1 pb-2">'
)
text = text.replace(old, new, 1)

text = text.replace(
    '                                        <p className="text-sm text-muted-foreground mt-1">{selectedCase?.category}</p>\n'
    '                                    </motion.div>\n\n'
    '                                    {/* Header with live score badge */}',
    '                                        <p className="text-sm text-muted-foreground mt-1">{selectedCase?.category}</p>\n'
    '                                    </motion.div>\n                                    )}\n\n'
    '                                    {/* Header with live score badge */}',
    1,
)
text = text.replace(
    '                                        <p className="text-sm text-muted-foreground mt-1">{selectedCase?.category}</p>\n'
    '                                    </motion.div>\n                                    )}\n\n'
    '                                    {/* Header with live score badge */}',
    '                                        <p className="text-sm text-muted-foreground mt-1">{selectedCase?.category}</p>\n'
    '                                    </motion.div>\n                                    )}\n\n'
    '                                    {/* Header with live score badge */}',
)
text = text.replace("</motion.div>\n                                    )}", "</div>\n                                    )}", 1)

pdf = (
    '                                {/* RIGHT: OSCE checklist PDF + snapshot */}\n'
    '                                <div className="hidden lg:flex flex-[2] flex-col gap-4 min-w-0">\n'
    '                                    <HistoryChecklistPdfPanel selectedCase={selectedCase} getCaseMockKey={getCaseMockKey} className="flex-1 min-h-[360px]" />\n'
)
old_right = '                                {/* RIGHT: Session Snapshot */}\n                                <div className="hidden lg:flex flex-[2] flex-col gap-4 min-w-0">'
text = text.replace(old_right, pdf, 1)

p.write_text(text, encoding="utf-8")
print("ok")
