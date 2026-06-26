export interface GroupPrivileges {
    can_request?: boolean;
    can_approve_specific?: boolean;
    can_approve_generic?: boolean;
    can_change_permission?: boolean;
    can_assign_group?: boolean;
    can_assign_permission?: boolean;
    can_manage_environment?: boolean;
    can_manage_template?: boolean;
    can_manage_OS?: boolean;
}