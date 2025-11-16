import { atom } from "jotai";

export interface User {
    id?: number;
    user_type?: string;
    first_name?: string;
    last_name?: string;
    region?: string;
    profile_image?: string;
}

export interface BhajanCategory {
    id: number;
    name: string;
    link: string;
    icon: string;
}

export interface Bhajan {
    id: number;
    title: string;
    title_guj: string;
    isAudio: boolean;
    isEng: boolean;
    isHnd: boolean;
    audio_url?: string;
    lyrics?: string;
    audioBase?: string;
    lyricsBase?: string;
    lyrics_html?: string;
}

export const bhajanCategoryAtom = atom<BhajanCategory[]>([]);
export const bhajansAtom = atom<Bhajan[]>([]);
export const activeCategoryAtom = atom<string>("All Kirtan");
export const audioBaseAtom = atom<string>("");
export const lyricsBaseAtom = atom<string>("");
export const currentBhajanAtom = atom<Bhajan | null>(null);
export const userAtom = atom<User>({});
export const notificationAtom = atom<any>(null);
export const newNotificationAtom = atom<string | null>(null);
export const notificationSocketAtom = atom<any>(null);
export const floatingPlayerActiveAtom = atom<boolean>(false);
export const bhajanIdAtom = atom<number | null>(null);
export const bhajanCatLinkAtom = atom<string | null>(null);
