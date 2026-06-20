export default function merge<T extends Record<string, any>>(
    target: T,
    ...sources: (Record<string, any> | null | undefined)[]
): T & Record<string, any> {
    target = target || ({} as T);
    sources.forEach((temp) => {
        if (temp) {
            Object.keys(temp).forEach((key) => {
                if (temp[key] !== null && temp[key] !== undefined) {
                    (target as Record<string, any>)[key] = temp[key];
                }
            });
        }
    });
    return target;
}
