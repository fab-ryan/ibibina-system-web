"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

type PaginationProps = {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
    itemCount?: number;
    isLoading?: boolean;
};

function clampPage(page: number, totalPages: number) {
    return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

function buildPageItems(currentPage: number, totalPages: number) {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);
    pages.add(currentPage - 1);
    pages.add(currentPage);
    pages.add(currentPage + 1);

    const sorted = Array.from(pages)
        .filter((page) => page >= 1 && page <= totalPages)
        .sort((a, b) => a - b);

    const items: Array<number | "dots"> = [];
    for (let index = 0; index < sorted.length; index += 1) {
        const page = sorted[index];
        const previous = sorted[index - 1];

        if (previous && page - previous > 1) {
            items.push("dots");
        }
        items.push(page);
    }

    return items;
}

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemCount,
    isLoading,
}: PaginationProps) {
    const safeCurrentPage = clampPage(currentPage, totalPages);
    const pageItems = buildPageItems(safeCurrentPage, totalPages);

    return (
        <div className="flex flex-col gap-3 border-t border-(--ib-line) px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-(--ib-muted)">
                {typeof totalItems === "number" && typeof itemCount === "number"
                    ? `Showing ${itemCount} of ${totalItems} users`
                    : `Page ${safeCurrentPage} of ${Math.max(totalPages, 1)}`}
            </p>

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-(--ib-line) px-3 text-sm font-semibold text-(--ib-muted) transition-colors hover:bg-[#f4f7fc] disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => onPageChange(safeCurrentPage - 1)}
                    disabled={safeCurrentPage <= 1 || isLoading}
                >
                    <ChevronLeft size={16} />
                    Prev
                </button>

                {pageItems.map((item, index) => {
                    if (item === "dots") {
                        return (
                            <span key={`dots-${index}`} className="grid h-9 w-9 place-items-center text-(--ib-muted)">
                                <MoreHorizontal size={15} />
                            </span>
                        );
                    }

                    const isActive = item === safeCurrentPage;
                    return (
                        <button
                            key={item}
                            type="button"
                            onClick={() => onPageChange(item)}
                            disabled={isLoading}
                            className={`h-9 w-9 rounded-lg border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isActive
                                    ? "border-[#0b3978] bg-[#0b3978] text-white"
                                    : "border-(--ib-line) text-(--ib-muted) hover:bg-[#f4f7fc]"
                                }`}
                            aria-current={isActive ? "page" : undefined}
                        >
                            {item}
                        </button>
                    );
                })}

                <button
                    type="button"
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-(--ib-line) px-3 text-sm font-semibold text-(--ib-muted) transition-colors hover:bg-[#f4f7fc] disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => onPageChange(safeCurrentPage + 1)}
                    disabled={safeCurrentPage >= totalPages || isLoading}
                >
                    Next
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}