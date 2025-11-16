export class Path {  
    static GetDirectoryName(path: string): string {  
        const lastSlashIndex = path.lastIndexOf('/');  
        const lastBackslashIndex = path.lastIndexOf('\\');  
        const lastPathSeparatorIndex = Math.max(lastSlashIndex, lastBackslashIndex);  
  
        if (lastPathSeparatorIndex === -1) {  
            return ''; // 没有路径分隔符，返回空字符串  
        }  
  
        return path.substring(0, lastPathSeparatorIndex);  
    }  
  
    static GetFileName(path: string): string {  
        const lastSlashIndex = path.lastIndexOf('/');  
        const lastBackslashIndex = path.lastIndexOf('\\');  
        const lastPathSeparatorIndex = Math.max(lastSlashIndex, lastBackslashIndex);  
  
        if (lastPathSeparatorIndex === -1) {  
            return path; // 没有路径分隔符，返回整个路径  
        }  
  
        return path.substring(lastPathSeparatorIndex + 1);  
    }  
  
    static GetExtension(path: string): string {  
        const lastDotIndex = path.lastIndexOf('.');  
        if (lastDotIndex === -1) {  
            return ''; // 没有扩展名，返回空字符串  
        }  
  
        return path.substring(lastDotIndex);  
    }  
  
    static GetFileNameWithoutExtension(path: string): string {  
        const lastDotIndex = path.lastIndexOf('.');  
        const fileName = this.GetFileName(path);  
  
        if (lastDotIndex === -1) {  
            return fileName; // 没有扩展名，返回文件名  
        }  
  
        if (lastDotIndex < fileName.length - 1) {  
            return fileName.substring(0, lastDotIndex);  
        }  
  
        return fileName;  
    }  
  
    static Combine(...paths: string[]): string {  
        return paths.map(x=>{
            if(x.startsWith('/')){
                x = x.substring(1)
            }
            else if(x.startsWith('\\')){
                x = x.substring(1)
            }
            else if(x.endsWith('/')){
                x = x.substring(0, x.length - 1)
            }
            else if(x.endsWith('\\')){
                x = x.substring(0, x.length - 1)
            }
            return x;
        }).filter(x=>x.length>0).join('/')
    }  
  
    static GetFullPath(path: string, basePath: string): string {  
        if (path.startsWith('/') || path.startsWith('\\') || path.includes(':')) {  
            return path; // 已经是绝对路径，直接返回  
        }  
  
        if (!basePath.endsWith('/') && !basePath.endsWith('\\')) {  
            basePath += '/';  
        }  
  
        return this.Combine(basePath, path);  
    }  
}