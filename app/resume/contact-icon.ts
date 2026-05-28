/**
 * contact-icon.ts — label → react-icons/fa6 component mapping.
 *
 * Shared by ResumeScreen and ResumePrint so the rail (screen) and the
 * header (print PDF) agree on which icon represents which contact line
 * without each surface re-inventing the keyword match.
 */

import type { IconType } from "react-icons";
import {
  FaEnvelope,
  FaGithub,
  FaGlobe,
  FaLink,
  FaLinkedinIn,
  FaPhone,
} from "react-icons/fa6";

export function getContactIcon(label: string): IconType {
  const l = (label ?? "").toLowerCase();
  if (l.includes("phone") || l.includes("tel") || l.includes("cell")) return FaPhone;
  if (l.includes("email") || l.includes("mail")) return FaEnvelope;
  if (l.includes("linkedin")) return FaLinkedinIn;
  if (l.includes("github") || l.includes("git")) return FaGithub;
  if (
    l.includes("site") ||
    l.includes("web") ||
    l.includes("portfolio") ||
    l.includes("page")
  )
    return FaGlobe;
  return FaLink;
}
