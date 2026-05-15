import Pagination from "./pagination";

export type TableHeader = {
    key: string;
    label: React.ReactNode;
    className?: string;
};

type TableProps = {
    headers: TableHeader[];
    children: React.ReactNode;
    colSpan: number;
    isLoading?: boolean;
    loadingText?: string;
    isEmpty?: boolean;
    emptyState?: React.ReactNode;
    minWidthClassName?: string;
    tableClassName?: string;
    bodyClassName?: string;
    pagination?: {
        currentPage: number;
        totalPages: number;
        onPageChange: (page: number) => void;
        totalItems?: number;
        itemCount?: number;
        isLoading?: boolean;
    };
};

export default function Table({
    headers,
    children,
    colSpan,
    isLoading = false,
    loadingText = "Loading...",
    isEmpty = false,
    emptyState,
    minWidthClassName = "min-w-270",
    tableClassName = "",
    bodyClassName = "divide-y divide-(--ib-line)",
    pagination,
}: TableProps) {
    return (
        <>
            {/* <div className="overflow-x-auto"> */}
                <table className={`w-full ${minWidthClassName} text-left text-sm ${tableClassName}`.trim()}>
                    <thead className="border-b border-(--ib-line) bg-gray-50 text-xs font-bold uppercase tracking-wide text-[#375176]/70">
                        <tr>
                            {headers.map((header) => (
                                <th key={header.key} className={header.className ?? "px-4 py-4"}>
                                    {header.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className={bodyClassName}>
                        {isLoading && (
                            <tr>
                                <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-(--ib-muted)">
                                    {loadingText}
                                </td>
                            </tr>
                        )}
                        {!isLoading && children}
                    </tbody>
                </table>
            {/* </div> */}

            {!isLoading && isEmpty && emptyState}

            {pagination && pagination?.totalPages > 1 && (
                <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.totalItems}
                    itemCount={pagination.itemCount}
                    isLoading={pagination.isLoading}
                    onPageChange={pagination.onPageChange}
                />
            )}
        </>
    );
}