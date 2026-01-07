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
            cacheLocation: 'sessionStorage',
            storeAuthStateInCookie: true, // Set to true to help with silent auth in some browsers
        }
    };

    if (!msalInstance) {
        msalInstance = new PublicClientApplication(msalConfig);
        await msalInstance.initialize();
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
 * Get SharePoint Site ID (cached)
 */
const getSiteId = async (siteUrl: string): Promise<string> => {
    if (cachedSiteId) return cachedSiteId;

    const accessToken = await getAccessToken();
    const url = new URL(siteUrl);
    const hostname = url.hostname;
    let sitePath = url.pathname || '';

    // Remove trailing slash if present
    if (sitePath.endsWith('/')) {
        sitePath = sitePath.slice(0, -1);
    }

    // For Graph API, we need the format: sites/{hostname}:/{path}:
    // For root site (no path), we use: sites/{hostname}:/
    let siteApiUrl: string;
    if (!sitePath || sitePath === '' || sitePath === '/') {
        // Root site - use colon notation with just hostname
        siteApiUrl = `https://graph.microsoft.com/v1.0/sites/${hostname}:/`;
    } else {
        // Subsite - use full path with colon
        siteApiUrl = `https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`;
    }

    console.log('Fetching site from:', siteApiUrl);

    const response = await fetch(siteApiUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Site fetch error:', response.status, errorText);
        throw new Error(`Failed to get site: ${response.status} - ${response.statusText}. Check that you have Sites.Read.All permission and the site URL is correct.`);
    }

    const siteData = await response.json();
    console.log('Site ID obtained:', siteData.id);
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
            throw new Error(`Failed to get list items: ${itemsResponse.statusText}`);
        }

        const itemsData = await itemsResponse.json();
        return itemsData.value.map((item: any) => ({ ...item.fields, _itemId: item.id }));
    } catch (error: any) {
        console.error('SharePoint data fetch error:', error);
        throw new Error(`Error fetching SharePoint data: ${error.message}`);
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
 * Create a consultant in SP_Consultores
 */
export const createConsultantInSharePoint = async (consultant: Consultant, siteUrl?: string): Promise<void> => {
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
    };

    await createListItem(siteId, listId, fields);
    console.log('Consultant created in SharePoint:', consultant.name);
};

/**
 * Create a project in SP_Proyectos
 */
export const createProjectInSharePoint = async (project: Project, siteUrl?: string): Promise<void> => {
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
    };

    await createListItem(siteId, listId, fields);
    console.log('Project created in SharePoint:', project.name);
};

/**
 * Create an assignment in SP_Asignaciones
 */
export const createAssignmentInSharePoint = async (assignment: Assignment, siteUrl?: string): Promise<void> => {
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

    await createListItem(siteId, listId, fields);
    console.log('Assignment created in SharePoint:', assignment.id);
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
