import { useMemo } from "react";

interface UsePaginationProps {
  currentPage: number;
  totalPages: number;
  siblingCount?: number;
}

const range = (start: number, end: number): number[] => {
  const length = end - start + 1;
  return Array.from({ length }, (_, idx) => idx + start); //0,1,2 => [4,5,6]
};

export const DOTS = "...";

export const usePagination = ({
  currentPage,
  totalPages,
  siblingCount = 1,
}: UsePaginationProps) => {
  const paginationRange = useMemo(() => {
    // 1. Define the total number of page links to be visible.
    const totalPageNumbers = 6; // As specified in requirements

    // 2. Handle the simple case where we show all pages without ellipses.
    if (totalPageNumbers >= totalPages) {
      return range(1, totalPages);
    }

    // 3. Calculate sibling indexes and determine if dots are needed.
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    // 4. Construct the pagination array step-by-step.
    const paginationArray: (number | string)[] = [];

    // Always push the first page number.
    paginationArray.push(1);

    // Push left dots if needed.
    if (shouldShowLeftDots) {
      paginationArray.push(DOTS); // [1,'...']
    }

    // Push the middle range of pages.
    const middleRangeStart = shouldShowLeftDots ? leftSiblingIndex : 2;
    const middleRangeEnd = shouldShowRightDots
      ? rightSiblingIndex
      : totalPages - 1;

    //[1,'...',4,5,6]

    const middleRange = range(middleRangeStart, middleRangeEnd);
    paginationArray.push(...middleRange); // [4,5,6]
    //[1,'...',4,5,6]

    // Push right dots if needed.
    if (shouldShowRightDots) {
      paginationArray.push(DOTS);
    }

    // Always push the last page number.
    paginationArray.push(totalPages); //[1,'...',4,5,6,7]

    return paginationArray;
  }, [currentPage, totalPages, siblingCount]);

  return paginationRange;
};
