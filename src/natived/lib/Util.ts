import { useRef, useState } from "react";


export const assign = (from: any, to: any) => {
    if (typeof from !== 'object' || typeof to !== 'object') return;
    for (let key in from) {
        if (typeof from[key] === 'object') {
            if (!to[key]) to[key] = {}
            assign(from[key], to[key])
        }
        else to[key] = from[key]
    }
    return to
}

export const assigns = (from: any[], to: any) => {
    for (let i = 0; i < from.length; i++) {
        assign(from[i], to)
    }
    return to;
}

export const convertLengthToAlias = (length: number) => {
    if (length < 1024) return length + 'B';
    if (length < 1024 * 1024) return (length / 1024).toFixed(2) + 'KB';
    if (length < 1024 * 1024 * 1024) return (length / 1024 / 1024).toFixed(2) + 'MB';
    return (length / 1024 / 1024 / 1024).toFixed(2) + 'GB';
}

export const useUpdate = <T>(value: T) => {
    const [state, setstate] = useState<T>(value)
    const ref = useRef<T>(value)
    const update = (value: React.SetStateAction<T>) => {
        if (typeof value == "function") {
            let func = value as (prevState: T) => T;
            setstate(old => {
                let newState = func(old);
                ref.current = newState;
                return newState;
            });
        }
        else {
            ref.current = value
            setstate(value)
        }

    }
    return [state, update, ref] as const
}

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const safeJsonStringify = (obj: any, indent = 3) => {
    const cache = new Set();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (cache.has(value)) {
                return; // Remove circular references
            }
            cache.add(value);
        }
        return value;
    }, indent);
}