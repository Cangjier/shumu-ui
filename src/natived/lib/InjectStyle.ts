

const InjectStyle = (value: string) => {
    const id = `rand_${Math.random().toString(36).substr(2, 9)}`
    if (document.getElementById(id) === null) {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.id = id;
        style.innerHTML = value;
        document.getElementsByTagName('head')[0].appendChild(style);
    }
}

const InjectStyleByID = (id: string, value: string) => {
    if (document.getElementById(id) === null) {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.id = id;
        style.innerHTML = value;
        document.getElementsByTagName('head')[0].appendChild(style);
    }
}


const InjectClass = (value: string, other?: {
    hover?: string,
    before?: string,
    after?: string,
    scrollbar?: string,
    scrollbarThumb?: string,
    scrollbarTrack?: string,
    keyframes?: { [key: string]: string },
    other?: string

}) => {
    const id = `rand_${Math.random().toString(36).substr(2, 9)}`
    const style = document.createElement('style');
    style.type = 'text/css';
    style.id = id;
    style.innerHTML = `
    .${id} {${value}}
    .${id}:hover {${other?.hover ?? ""}}
    .${id}::before {${other?.before ?? ""}}
    .${id}::after {${other?.after ?? ""}}
    .${id}::-webkit-scrollbar {${other?.scrollbar ?? ""}}
    .${id}::-webkit-scrollbar-thumb {${other?.scrollbarThumb ?? ""}}
    .${id}::-webkit-scrollbar-track {${other?.scrollbarTrack ?? ""}}
    ${Object.keys(other?.keyframes ?? {}).map(key => `
    @keyframes ${key} {${other?.keyframes?.[key]}}
    `).join('')}
    ${other?.other ?? ""}
    `;
    document.getElementsByTagName('head')[0].appendChild(style);
    return id;
}

const RandID = () => `rand_${Math.random().toString(36).substr(2, 9)}`;

export { InjectStyle, InjectClass, InjectStyleByID, RandID }