// backend/src/core/permissions.js
class PermissionSystem {
    constructor() {
      this.roles = {
        admin: ['*'],
        developer: ['create', 'read', 'update', 'delete', 'execute'],
        user: ['create', 'read', 'execute'],
        viewer: ['read']
      };
      
      this.resourcePermissions = new Map();
    }
  
    hasPermission(role, action, resource = null) {
      const rolePermissions = this.roles[role] || [];
      
      // Admin has all permissions
      if (rolePermissions.includes('*')) {
        return true;
      }
      
      // Check specific permission
      if (rolePermissions.includes(action)) {
        // Check resource-specific permissions if needed
        if (resource && this.resourcePermissions.has(resource)) {
          const resourcePerms = this.resourcePermissions.get(resource);
          return resourcePerms.roles.includes(role);
        }
        return true;
      }
      
      return false;
    }
  
    setResourcePermission(resource, roles) {
      this.resourcePermissions.set(resource, { roles });
    }
  
    checkAgentPermission(agentId, userId, action) {
      // For now, simple check - can be expanded
      return true;
    }
  
    validateRequest(req, action, resource) {
      // Extract user role from request (would come from JWT in production)
      const userRole = req.headers['x-user-role'] || 'user';
      
      if (!this.hasPermission(userRole, action, resource)) {
        throw new Error(`Permission denied: ${action} on ${resource}`);
      }
      
      return true;
    }
  }
  
  module.exports = new PermissionSystem();