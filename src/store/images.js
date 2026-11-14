import { isNpc } from "./roles";

// File suffix for a token's good ("_g") or evil ("_e") art. Index 0 is the
// role's default alignment; travellers have neutral art at index 0.
const getAlignmentSuffix = (role, alignmentIndex) => {
  if (isNpc(role)) return "";
  if (["townsfolk", "outsider"].includes(role.team)) {
    return alignmentIndex === 0 ? "_g" : "_e";
  }
  if (["minion", "demon"].includes(role.team)) {
    return alignmentIndex === 0 ? "_e" : "_g";
  }
  if (alignmentIndex === 1) return "_g";
  if (alignmentIndex === 2) return "_e";
  return "";
};

export const getRoleImage = (
  role,
  alignmentIndex,
  { isImageOptIn, isArtUnofficial },
) => {
  if (role.image && isImageOptIn) {
    if (Array.isArray(role.image)) {
      return role.image[alignmentIndex] || role.image[0];
    }
    return role.image;
  }

  const name = role.imageAlt || role.id;
  const alignment = getAlignmentSuffix(role, alignmentIndex);
  const useUnofficialArt =
    ["good", "evil"].includes(role.imageAlt) || isArtUnofficial;
  const path = useUnofficialArt
    ? "unofficial/" +
      (alignmentIndex > 0 ? "Alternate/" : "") +
      name +
      (role.team === "traveller" ? alignment : "")
    : "official/" +
      (role.imageAlt ? "generic" : role.edition) +
      "/" +
      name +
      alignment;
  return require("../assets/icons/" + path + ".webp");
};
