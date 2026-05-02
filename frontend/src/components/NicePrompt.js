import { useEffect, useRef } from "react";

/**
 * Modal nhập liệu đẹp với Tailwind.
 * Props:
 *  - open, title, description?
 *  - children: JSX inputs
 *  - onCancel(), onSubmit()
 *  - submitText?, submitting?
 */
export default function NicePrompt({
                                       open,
                                       title,
                                       description,
                                       children,
                                       onCancel,
                                       onSubmit,
                                       submitText = "Xác nhận",
                                       submitting = false,
                                   }) {
    const ref = useRef(null);

    useEffect(() => {
        function onKey(e) {
            if (!open) return;
            if (e.key === "Escape") onCancel?.();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
            <div className="absolute inset-0 grid place-items-center p-4">
                <div
                    ref={ref}
                    className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-indigo-100"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="px-5 py-4 border-b flex items-center justify-between">
                        <div className="font-semibold text-slate-900">{title}</div>
                        <button className="text-slate-500 hover:text-slate-700" onClick={onCancel} aria-label="Đóng">
                            ✕
                        </button>
                    </div>

                    <div className="px-5 pt-4 pb-2">
                        {description ? <p className="text-sm text-slate-500 mb-3">{description}</p> : null}
                        {children}
                    </div>

                    <div className="px-5 py-4 border-t flex items-center justify-end gap-2">
                        <button className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200" onClick={onCancel} disabled={submitting}>
                            Hủy
                        </button>
                        <button
                            className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                            onClick={onSubmit}
                            disabled={submitting}
                        >
                            {submitting ? "Đang lưu…" : submitText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
