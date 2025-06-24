import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { usePagination } from "@/hooks/use-pagination";

export const DOTS = "...";

interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  siblingCount?: number;
  isDisabled?: boolean;
  onPageChange: (page: number) => void;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  siblingCount = 1,
  isDisabled,
  onPageChange,
}: PaginationControlProps) {
  // Don't render the component if there's only one page.
  const pageRange = usePagination({ currentPage, totalPages, siblingCount });

  if (totalPages <= 1) {
    return null;
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const isPrevDisabled = currentPage === 1 || isDisabled;
  const isNextDisabled = currentPage === totalPages || isDisabled;

  return (
    <Pagination>
      <PaginationContent>
        {/* Previous Button */}
        <PaginationItem>
          <PaginationPrevious
            onClick={handlePrevious}
            aria-disabled={isPrevDisabled}
            className={
              isPrevDisabled
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
          />
        </PaginationItem>

        {/* Page Number Links & Ellipses */}
        {pageRange.map((page, index) => {
          // If the page is an ellipsis, render the ellipsis component
          if (page === DOTS) {
            return (
              <PaginationItem key={`${DOTS}-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            );
          }

          const pageNumber = page as number;
          return (
            <PaginationItem key={pageNumber}>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (!isDisabled) {
                    onPageChange(pageNumber);
                  }
                }}
                isActive={pageNumber === currentPage}
                aria-disabled={isDisabled}
                className={`
                  ${
                    isDisabled
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                    ${pageNumber === currentPage ? "border-border-2" : ""}
                `}
              >
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          );
        })}

        {/* Next Button */}
        <PaginationItem>
          <PaginationNext
            onClick={handleNext}
            aria-disabled={isNextDisabled}
            className={
              isNextDisabled
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
