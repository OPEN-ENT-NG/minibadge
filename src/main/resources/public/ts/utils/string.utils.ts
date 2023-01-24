import {idiom as lang} from "entcore";

export function translate(key: string, params?: string[]) {
    return lang.translate(key).replace(/{(\d+)}/g,
        (value, i) => typeof params[i] != "undefined" ? params[i] : value);
}

export function unaccent(value: string) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}