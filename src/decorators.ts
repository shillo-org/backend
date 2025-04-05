import { createParamDecorator, ExecutionContext, PipeTransform, Type } from '@nestjs/common';

/**
 * Parameter decorator that extracts the user object from the request.
 * This decorator retrieves the user information that was attached
 * during authentication by the PrivyAuthGuard.
 * 
 * @example
 * // Get the entire user object
 * @Get('profile')
 * getProfile(@CurrentUser() user) {
 *   return user;
 * }
 * 
 * @example
 * // Get a specific property from the user
 * @Get('profile-id')
 * getProfileId(@CurrentUser('id') userId: string) {
 *   return { id: userId };
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // If a specific property is requested and it exists on the user object
    if (data && user) {
      return user[data];
    }
    
    // Return the whole user object
    return user;
  },
);

// Type definition for the CurrentUser decorator to help TypeScript
export type CurrentUserType = typeof CurrentUser;