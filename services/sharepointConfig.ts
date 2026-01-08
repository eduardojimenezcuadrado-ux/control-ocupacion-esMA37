/**
 * Parse SharePoint URL to extract site URL and list name
 */
export const parseSharePointUrl = (url: string): { siteUrl: string; listName: string } | null => {
    try {
        const urlObj = new URL(url);

        // Extract site URL (everything before /Lists/ or /Forms/)
        const pathname = urlObj.pathname;
        const listMatch = pathname.match(/^(.*?)\/(Lists|Forms)\//);

        if (!listMatch) {
            return null;
        }

        const sitePath = listMatch[1];
        const siteUrl = `${urlObj.protocol}//${urlObj.hostname}${sitePath}`;

        // Extract list name from the path
        const listNameMatch = pathname.match(/\/(Lists|Forms)\/([^\/]+)/);
        const listName = listNameMatch ? listNameMatch[2] : '';

        return { siteUrl, listName };
    } catch (error) {
        return null;
    }
};

/**
 * Validate SharePoint URL format
 */
export const isValidSharePointUrl = (url: string): boolean => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.includes('sharepoint.com');
    } catch {
        return false;
    }
};

/**
 * Extract site URL from full SharePoint URL
 */
export const extractSiteUrl = (fullUrl: string): string => {
    const parsed = parseSharePointUrl(fullUrl);
    return parsed?.siteUrl || fullUrl;
};

/**
 * Extract list name from SharePoint URL
 */
export const extractListName = (fullUrl: string): string => {
    const parsed = parseSharePointUrl(fullUrl);
    return parsed?.listName || '';
};

/**
 * SharePoint List Names
 */
export const SP_LISTS = {
    CONSULTORES: 'SP_Consultores',
    PROYECTOS: 'SP_Proyectos',
    ASIGNACIONES: 'SP_Asignaciones',
    AUSENCIAS: 'SP_Ausencias',
} as const;

/**
 * Default SharePoint configuration
 */
export const getDefaultSharePointConfig = () => {
    return {
        siteUrl: (import.meta as any).env.VITE_SHAREPOINT_SITE_URL || 'https://raonamadrid.sharepoint.com',
        listNames: SP_LISTS,
        clientId: (import.meta as any).env.VITE_SHAREPOINT_CLIENT_ID || '',
        tenantId: (import.meta as any).env.VITE_SHAREPOINT_TENANT_ID || '',
    };
};
