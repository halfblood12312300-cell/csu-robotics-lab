import { createContext, useContext } from "react";
import type { Asset } from "../content";
import { normalizeRepositoryMediaPath } from "../repository-media-path";

export const MediaCapabilitiesContext = createContext({ mediaUpload: false });
export const useMediaCapabilities = () => useContext(MediaCapabilitiesContext);
export const repositoryMediaFolder = "https://github.com/halfblood12312300-cell/csu-robotics-lab/tree/main/public/media";
export function repositoryMediaFile(asset: Asset) {
  const path = normalizeRepositoryMediaPath(asset.url);
  return path
    ? "https://github.com/halfblood12312300-cell/csu-robotics-lab/blob/main/public" + path
    : repositoryMediaFolder;
}
