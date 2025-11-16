export class String {
    public static IsNullOrEmpty(str: string | null | undefined): boolean {
        return !str || str.length === 0
    }
    public static IsNullOrWhiteSpace(str: string | null | undefined): boolean {
        return !str || str.trim().length === 0
    }
    public static Trim(str: string | null | undefined, chars: string): string {  
        // 处理 null 或 undefined 的情况  
        if (str == null) {  
            return '';  
        }  
      
        // 将 chars 转换为一个 Set 以进行高效查找  
        const charSet = new Set(chars);  
      
        // 从左侧修剪  
        let left = 0;  
        while (left < str.length && charSet.has(str[left])) {  
            left++;  
        }  
      
        // 从右侧修剪  
        let right = str.length - 1;  
        while (right >= left && charSet.has(str[right])) {  
            right--;  
        }  
      
        // 返回修剪后的字符串  
        return str.slice(left, right + 1);  
    }
    public static TrimStart(str: string | null | undefined, chars: string): string {
        // 处理 null 或 undefined 的情况  
        if (str == null) {  
            return '';  
        }  
      
        // 将 chars 转换为一个 Set 以进行高效查找  
        const charSet = new Set(chars);  
      
        // 从左侧修剪  
        let left = 0;  
        while (left < str.length && charSet.has(str[left])) {  
            left++;  
        }  
      
        // 返回修剪后的字符串  
        return str.slice(left);  
    }
    public static TrimEnd(str: string | null | undefined, chars: string): string {
        // 处理 null 或 undefined 的情况  
        if (str == null) {  
            return '';  
        }  
      
        // 将 chars 转换为一个 Set 以进行高效查找  
        const charSet = new Set(chars);  
      
        // 从右侧修剪  
        let right = str.length - 1;  
        while (right >= 0 && charSet.has(str[right])) {  
            right--;  
        }  
      
        // 返回修剪后的字符串  
        return str.slice(0, right + 1);  
    }
}