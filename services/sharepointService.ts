import { PublicClientApplication, AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { Consultant, Project, Assignment, ProjectType, AssignmentStatus } from '../types';
import { SP_LISTS, getDefaultSharePointConfig } from './sharepointConfig';

let msalInstance: PublicClientApplication | null = null;
let currentAccount: AccountInfo | null = null;
let cachedSiteId: string | null = null;

const SCOPES_READ = ['Sites.Read.All', 'User.Read'];
const SCOPES_WRITE = ['Sites.ReadWrite.All', 'User.Read'];

/**
 * Initialize MSAL for SharePoint authentication
 */
export const initializeMSAL = async (clientId: string, tenantId: string): Promise<PublicClientApplication> => {
    const msalConfig = {
        auth: {
            clientId: clientId,
            authority: `https://login.microsoftonline.com/${tenantId}`,
            redirectUri: window.location.origin,
        },
        cache: {
            cacheLocation: 'localStorage',
            storeAuthStateInCookie: true, // Set to true to help with silent auth in some browsers
        }
    };

    if (!msalInstance) {
        msalInstance = new PublicClientApplication(msalConfig);
        await msalInstance.initialize();

        // Handle redirect result (important for proper SSO flow)
        const response = await msalInstance.handleRedirectPromise();
        if (response) {
            currentAccount = response.account;
            msalInstance.setActiveAccount(response.account);
        }
    }

    return msalInstance;
};

/**
 * Attempt to restore session silently
 */
export const trySilentAuth = async (): Promise<AccountInfo | null> => {
    if (!msalInstance) return null;

    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
        currentAccount = accounts[0];
        return currentAccount;
    }

    try {
        const response = await msalInstance.ssoSilent({
            scopes: SCOPES_READ,
        });
        currentAccount = response.account;
        msalInstance.setActiveAccount(currentAccount);
        return currentAccount;
    } catch (error) {
        console.log('Silent auth failed, user needs to sign in manually');
        return null;
    }
};

/**
 * Authenticate user via Microsoft login popup
 */
export const authenticateUser = async (writeAccess = false): Promise<AccountInfo> => {


    try {
        if (!msalInstance) {
            const config = getDefaultSharePointConfig();
            await initializeMSAL(config.clientId, config.tenantId);
        }

        const loginRequest = {
            scopes: writeAccess ? SCOPES_WRITE : SCOPES_READ,
        };

        const response: AuthenticationResult = await msalInstance.loginPopup(loginRequest);
        currentAccount = response.account;

        if (!currentAccount) {
            throw new Error('Authentication failed: No account returned');
        }

        return currentAccount;
    } catch (error: any) {
        console.error('Authentication error:', error);
        throw new Error(`Authentication failed: ${error.message}`);
    }
};

/**
 * Trigger login redirect (for automatic flow)
 */
export const login = async (): Promise<void> => {
    if (!msalInstance) {
        const config = getDefaultSharePointConfig();
        await initializeMSAL(config.clientId, config.tenantId);
    }

    if (msalInstance) {
        await msalInstance.loginRedirect({
            scopes: SCOPES_READ,
        });
    }
};

/**
 * Get access token for Microsoft Graph API
 */
const getAccessToken = async (writeAccess = false): Promise<string> => {
    if (!msalInstance || !currentAccount) {
        throw new Error('User not authenticated. Call authenticateUser first.');
    }

    try {
        const tokenRequest = {
            scopes: writeAccess ? SCOPES_WRITE : SCOPES_READ,
            account: currentAccount,
        };

        const response = await msalInstance.acquireTokenSilent(tokenRequest);
        return response.accessToken;
    } catch (error) {
        const tokenRequest = {
            scopes: writeAccess ? SCOPES_WRITE : SCOPES_READ,
            account: currentAccount,
        };
        const response = await msalInstance.acquireTokenPopup(tokenRequest);
        return response.accessToken;
    }
};

/**
 * Get SharePoint Site ID (cached by URL)
 */
let lastRequestedUrl: string | null = null;
const getSiteId = async (siteUrl: string): Promise<string> => {
    // Basic validation and protocol addition
    let normalizedUrl = siteUrl.trim();
    if (normalizedUrl && !normalizedUrl.startsWith('http')) {
        normalizedUrl = `https://${normalizedUrl}`;
    }

    // If URL changed, clear cache to force re-fetch from new site
    if (lastRequestedUrl && lastRequestedUrl !== normalizedUrl) {
        console.log('🔄 SharePoint URL changed, clearing site cache...');
        cachedSiteId = null;
    }
    lastRequestedUrl = normalizedUrl;

    if (cachedSiteId) return cachedSiteId;

    const accessToken = await getAccessToken();
    const url = new URL(normalizedUrl);
    const hostname = url.hostname;

    // Improved path extraction: only take the base site path (e.g. /sites/Marketing)
    // and ignore anything after /Lists/, /Forms/ or /Shared Documents/
    let sitePath = url.pathname || '';
    const cleanPathMatch = sitePath.match(/^(.*?)(\/(Lists|Forms|Shared Documents|ListsExternal)\/|$)/i);
    if (cleanPathMatch) {
        sitePath = cleanPathMatch[1];
    }

    // Remove trailing slash
    if (sitePath.endsWith('/')) {
        sitePath = sitePath.slice(0, -1);
    }

    // Format the Graph API URL for site lookup
    let siteApiUrl: string;
    if (!sitePath || sitePath === '' || sitePath === '/') {
        // Tenant root
        siteApiUrl = `https://graph.microsoft.com/v1.0/sites/${hostname}:/`;
    } else {
        // Sub-site
        siteApiUrl = `https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`;
    }

    console.log('🔍 Resolving SharePoint Site ID for:', sitePath || '(root)');
    console.log('📡 Graph API Call:', siteApiUrl);

    const response = await fetch(siteApiUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Site fetch error:', response.status, errorText);

        if (response.status === 403) {
            throw new Error(`Acceso Denegado (403). Verifica que tienes permisos en el sitio "${siteUrl}" y que la URL es correcta.`);
        }

        throw new Error(`Error ${response.status}: ${response.statusText}. Verifica la URL del sitio.`);
    }

    const siteData = await response.json();
    console.log('✅ Site ID obtained:', siteData.id);
    cachedSiteId = siteData.id;
    return cachedSiteId!;
};

/**
 * Fetch SharePoint list items using Microsoft Graph API
 */
export const fetchSharePointListData = async (
    siteUrl: string,
    listName: string
): Promise<any[]> => {
    try {
        const accessToken = await getAccessToken();
        const siteId = await getSiteId(siteUrl);

        // Get list ID
        const listsApiUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists?$filter=displayName eq '${listName}'`;
        const listsResponse = await fetch(listsApiUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!listsResponse.ok) {
            throw new Error(`Failed to get lists: ${listsResponse.statusText}`);
        }

        const listsData = await listsResponse.json();

        if (!listsData.value || listsData.value.length === 0) {
            throw new Error(`List "${listName}" not found in SharePoint site`);
        }

        const listId = listsData.value[0].id;

        // Get list items with all fields
        const itemsApiUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?$expand=fields`;
        const itemsResponse = await fetch(itemsApiUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!itemsResponse.ok) {
            const errorBody = await itemsResponse.json().catch(() => ({}));
            const message = errorBody.error?.message || itemsResponse.statusText;
            throw new Error(`Error obteniendo elementos de "${listName}": ${message}`);
        }

        const itemsData = await itemsResponse.json();
        return itemsData.value.map((item: any) => ({ ...item.fields, _itemId: item.id }));
    } catch (error: any) {
        console.error(`❌ SharePoint [${listName}] fetch error:`, error);
        throw error;
    }
};

// ============ CONSULTANT OPERATIONS ============

/**
 * Fetch consultants from SP_Consultores
 */
export const fetchConsultants = async (siteUrl?: string): Promise<Consultant[]> => {
    const config = getDefaultSharePointConfig();
    const url = siteUrl || config.siteUrl;

    const items = await fetchSharePointListData(url, SP_LISTS.CONSULTORES);

    return items.map((item: any) => ({
        id: item.Title || item.Email || crypto.randomUUID(),
        name: item.ConsultantName || item.Title || '',
        email: item.Email || item.Title || '',
        role: item.Role || 'Developer',
        active: item.IsActive !== false,
        notes: item.Notes || '',
        sharePointId: item._itemId,
    }));
};

// ============ PROJECT OPERATIONS ============

/**
 * Fetch projects from SP_Proyectos
 */
export const fetchProjects = async (siteUrl?: string): Promise<Project[]> => {
    const config = getDefaultSharePointConfig();
    const url = siteUrl || config.siteUrl;

    const items = await fetchSharePointListData(url, SP_LISTS.PROYECTOS);

    return items.map((item: any) => ({
        id: item.ProjectID || crypto.randomUUID(),
        name: item.Title || '',
        type: (item.ProjectType as ProjectType) || 'Cliente',
        client: item.ClientName || '',
        description: item.Description || '',
        active: item.IsActive !== false,
        sharePointId: item._itemId,
    }));
};

// ============ ASSIGNMENT OPERATIONS ============

/**
 * Fetch assignments from SP_Asignaciones
 */
export const fetchAssignments = async (siteUrl?: string): Promise<Assignment[]> => {
    const config = getDefaultSharePointConfig();
    const url = siteUrl || config.siteUrl;

    const items = await fetchSharePointListData(url, SP_LISTS.ASIGNACIONES);

    return items.map((item: any) => ({
        id: item.Title || crypto.randomUUID(),
        consultantId: item.ConsultantLookup || '',
        projectId: item.ProjectLookup || '',
        hours: parseFloat(item.Hours) || 0,
        status: (item.Status as AssignmentStatus) || 'Confirmada',
        description: item.Description || '',
        period: item.Period || '',
        isWeekly: item.Period?.includes('W') || false,
        sharePointId: item._itemId,
    }));
};

/**
 * Fetch all data from SharePoint (Consultants, Projects, Assignments)
 */
export const fetchAllSharePointData = async (siteUrl?: string): Promise<{
    consultants: Consultant[];
    projects: Project[];
    assignments: Assignment[];
}> => {
    const [consultants, projects, assignments] = await Promise.all([
        fetchConsultants(siteUrl),
        fetchProjects(siteUrl),
        fetchAssignments(siteUrl),
    ]);

    return { consultants, projects, assignments };
};

// ============ WRITE OPERATIONS ============

/**
 * Get list ID by name
 */
const getListId = async (siteId: string, listName: string): Promise<string> => {
    const accessToken = await getAccessToken(true);

    const listsApiUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists?$filter=displayName eq '${listName}'`;
    const response = await fetch(listsApiUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to get list: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.value || data.value.length === 0) {
        throw new Error(`List "${listName}" not found`);
    }

    return data.value[0].id;
};

/**
 * Create an item in a SharePoint list
 */
const createListItem = async (siteId: string, listId: string, fields: Record<string, any>): Promise<any> => {
    const accessToken = await getAccessToken(true);

    const apiUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Create item error:', response.status, errorText);
        throw new Error(`Failed to create item: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
};

/**
 * Delete an item from a SharePoint list
 */
const deleteListItem = async (siteId: string, listId: string, itemId: string): Promise<void> => {
    const accessToken = await getAccessToken(true);

    const apiUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${itemId}`;

    const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete item error:', response.status, errorText);
        throw new Error(`Failed to delete item: ${response.status} - ${response.statusText}`);
    }
};

/**
 * Update an item in a SharePoint list
 */
const updateListItem = async (siteId: string, listId: string, itemId: string, fields: Record<string, any>): Promise<any> => {
    const accessToken = await getAccessToken(true);

    const apiUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${itemId}/fields`;

    const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(fields),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Update item error:', response.status, errorText);
        throw new Error(`Failed to update item: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
};

/**
 * Create a consultant in SP_Consultores
 */
export const createConsultantInSharePoint = async (consultant: Consultant, siteUrl?: string): Promise<string> => {
    const config = getDefaultSharePointConfig();
    const url = siteUrl || config.siteUrl;

    const siteId = await getSiteId(url);
    const listId = await getListId(siteId, SP_LISTS.CONSULTORES);

    const fields = {
        Title: consultant.email || consultant.id,
        ConsultantName: consultant.name,
        Email: consultant.email,
        Role: consultant.role,
        IsActive: consultant.active,
        Notes: consultant.notes || '',
    };

    const result = await createListItem(siteId, listId, fields);
    console.log('Consultant created in SharePoint:', consultant.name);
    return result.id;
};

/**
 * Create a project in SP_Proyectos
 */
export const createProjectInSharePoint = async (project: Project, siteUrl?: string): Promise<string> => {
    const config = getDefaultSharePointConfig();
    const url = siteUrl || config.siteUrl;

    const siteId = await getSiteId(url);
    const listId = await getListId(siteId, SP_LISTS.PROYECTOS);

    const fields = {
        Title: project.name,
        ProjectID: project.id,
        ClientName: project.client || '',
        ProjectType: project.type,
        IsActive: project.active,
        Description: project.description || '',
    };

    const result = await createListItem(siteId, listId, fields);
    console.log('Project created in SharePoint:', project.name);
    return result.id;
};

/**
 * Create an assignment in SP_Asignaciones
 */
export const createAssignmentInSharePoint = async (assignment: Assignment, siteUrl?: string): Promise<string> => {
    const config = getDefaultSharePointConfig();
    const url = siteUrl || config.siteUrl;

    const siteId = await getSiteId(url);
    const listId = await getListId(siteId, SP_LISTS.ASIGNACIONES);

    const fields = {
        Title: assignment.id,
        ConsultantLookup: assignment.consultantId,
        ProjectLookup: assignment.projectId,
        Period: assignment.period,
        Hours: assignment.hours,
        Status: assignment.status,
        Description: assignment.description || '',
    };

    const result = await createListItem(siteId, listId, fields);
    console.log('Assignment created in SharePoint:', assignment.id);
    return result.id;
};

/**
 * Update a consultant in SP_Consultores
 */
export const updateConsultantInSharePoint = async (consultant: Consultant, siteUrl?: string): Promise<void> => {
    if (!consultant.sharePointId) return;

    const config = getDefaultSharePointConfig();
    const url = siteUrl || config.siteUrl;

    const siteId = await getSiteId(url);
    const listId = await getListId(siteId, SP_LISTS.CONSULTORES);

    const fields = {
        Title: consultant.email || consultant.id,
        ConsultantName: consultant.name,
        Email: consultant.email,
        Role: consultant.role,
        IsActive: consultant.active,
        Notes: consultant.notes || '',
    };

    await updateListItem(siteId, listId, consultant.sharePointId, fields);
    console.log('Consultant updated in SharePoint:', consultant.name);
};

/**
 * Update a project in SP_Proyectos
 */
export const updateProjectInSharePoint = async (project: Project, siteUrl?: string): Promise<void> => {
    if (!project.sharePointId) return;

    const config = getDefaultSharePointConfig();
    const url = siteUrl || config.siteUrl;

    const siteId = await getSiteId(url);
    const listId = await getListId(siteId, SP_LISTS.PROYECTOS);

    const fields = {
        Title: project.name,
        ProjectID: project.id,
        ClientName: project.client || '',
        ProjectType: project.type,
        IsActive: project.active,
        Description: project.description || '',
    };

    await updateListItem(siteId, listId, project.sharePointId, fields);
    console.log('Project updated in SharePoint:', project.name);
};

/**
 * Update an assignment in SP_Asignaciones
 */
export const updateAssignmentInSharePoint = async (assignment: Assignment, siteUrl?: string): Promise<void> => {
    if (!assignment.sharePointId) return;

    const config = getDefaultSharePointConfig();
    const url = siteUrl || config.siteUrl;

    const siteId = await getSiteId(url);
    const listId = await getListId(siteId, SP_LISTS.ASIGNACIONES);

    const fields = {
        Title: assignment.id,
        ConsultantLookup: assignment.consultantId,
        ProjectLookup: assignment.projectId,
        Period: assignment.period,
        Hours: assignment.hours,
        Status: assignment.status,
        Description: assignment.description || '',
    };

    await updateListItem(siteId, listId, assignment.sharePointId, fields);
    console.log('Assignment updated in SharePoint:', assignment.id);
};

/**
 * Delete a consultant from SP_Consultores
 */
export const deleteConsultantInSharePoint = async (consultantId: string, sharePointId: string, siteUrl?: string): Promise<void> => {
    const config = getDefaultSharePointConfig();
    const url = siteUrl || config.siteUrl;

    const siteId = await getSiteId(url);
    const listId = await getListId(siteId, SP_LISTS.CONSULTORES);

    await deleteListItem(siteId, listId, sharePointId);
    console.log('Consultant deleted from SharePoint:', consultantId);
};

/**
 * Delete a project from SP_Proyectos
 */
export const deleteProjectInSharePoint = async (projectId: string, sharePointId: string, siteUrl?: string): Promise<void> => {
    const config = getDefaultSharePointConfig();
    const url = siteUrl || config.siteUrl;

    const siteId = await getSiteId(url);
    const listId = await getListId(siteId, SP_LISTS.PROYECTOS);

    await deleteListItem(siteId, listId, sharePointId);
    console.log('Project deleted from SharePoint:', projectId);
};

/**
 * Delete an assignment from SP_Asignaciones
 */
export const deleteAssignmentInSharePoint = async (assignmentId: string, sharePointId: string, siteUrl?: string): Promise<void> => {
    const config = getDefaultSharePointConfig();
    const url = siteUrl || config.siteUrl;

    const siteId = await getSiteId(url);
    const listId = await getListId(siteId, SP_LISTS.ASIGNACIONES);

    await deleteListItem(siteId, listId, sharePointId);
    console.log('Assignment deleted from SharePoint:', assignmentId);
};

/**
 * Check if user is already authenticated
 */
export const isAuthenticated = (): boolean => {
    if (currentAccount) return true;

    if (msalInstance) {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
            currentAccount = accounts[0];
            msalInstance.setActiveAccount(currentAccount);
            return true;
        }
    }

    return false;
};

/**
 * Ensure MSAL is initialized and user is authenticated for operations
 */
export const ensureAuthenticated = async () => {
    const config = getDefaultSharePointConfig();

    if (!msalInstance) {
        await initializeMSAL(config.clientId, config.tenantId);
    }

    if (!isAuthenticated()) {
        await authenticateUser(true); // Default to write access if we need to force login
    }
};

/**
 * Sign out current user
 */
export const signOut = async (): Promise<void> => {
    if (msalInstance && currentAccount) {
        await msalInstance.logoutPopup({ account: currentAccount });
        currentAccount = null;
        cachedSiteId = null;
    }
};

/**
 * Get current authenticated user info
 */
export const getCurrentUser = (): AccountInfo | null => {
    return currentAccount;
};
