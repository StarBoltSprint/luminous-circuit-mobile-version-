import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Bug,
  Eye,
  Gem,
  MapPinned,
  Menu,
  MessageCircle,
  Pause,
  Play,
  Scale,
  ScrollText,
  Volume2,
  VolumeX,
  Zap,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";
import type { EngineHandle, HudSnap } from "@/game/engine";
import { briefCircuit } from "@/game/ask-agent";
import { CircuitMap } from "./CircuitMap";
import { LogSheet, type LogTab } from "./LogSheet";
import { TradingSheet } from "./TradingSheet";
import { DISTRICTS } from "@/game/lore";
import { civicForZone, civicBrief, enactCivic, howlVerb } from "@/game/civic";
import { FOLK_SKILLS, CREW_PICK, canBirthToday, loadFolkBook, interpretGrow, type FolkPost } from "@/game/inhabit";
import { loreCheck, visionKind, graphicPreview } from "@/game/lore-gate";
import { CircuitLive } from "./CircuitLive";
import { fetchVisions, proposeVision, decideVision, type Vision } from "@/game/visions";
import { buzz } from "@/game/haptics";
import { loadChain, needleDeg, talkWitness } from "@/game/play";
