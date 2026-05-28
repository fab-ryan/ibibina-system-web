import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, description }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.body.style.overflow = "hidden";
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#081936]/45 p-4 backdrop-blur-sm">
            <section className="w-full max-w-2xl flex flex-col rounded-xl border border-(--ib-line) bg-white shadow-2xl max-h-[80vh]" ref={modalRef}>
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-(--ib-line) p-5">
                    <div>
                        <h3 className="headline text-xl text-foreground">
                            {title}
                        </h3>
                        {description && (
                            <p className="mt-1 text-sm text-(--ib-muted)">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        className="grid h-9 w-9 place-items-center rounded-xl border border-(--ib-line) text-(--ib-muted) hover:bg-[#f4f7fc]"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={17} />
                    </button>
                </div>
                <div className="overflow-y-auto">
                    {children}
                </div>
            </section>
        </div>
    )
};

export default Modal;