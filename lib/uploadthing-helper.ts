export function extractFileKeyFromUrl(
  url: string | undefined | null
): string | null {
  // Return null immediately if the URL is null, undefined, or an empty string.
  if (!url) {
    return null;
  }

  // The file key is expected to be preceded by "/f/".
  // We can split the string by this delimiter.
  const parts = url.split("/f/");

  // If the split is successful, we will have an array with two elements.
  // The second element (at index 1) will be the file key.
  // We also check if the second part is not an empty string.
  if (parts.length === 2 && parts[1]) {
    // The part after /f/ could potentially have query parameters or a hash.
    // e.g., https://utfs.io/f/some-key?query=1 or https://utfs.io/f/some-key#hash
    // We split by '?' and '#' to isolate just the file key.
    const fileKey = parts[1].split("?")[0].split("#")[0];
    return fileKey;
  }

  // If the URL does not contain "/f/", it's not in the expected format.
  return null;
}
