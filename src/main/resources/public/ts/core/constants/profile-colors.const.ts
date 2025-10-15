import { UserProfile } from "../enum/user-profile.enum";

export const ProfileColorMap: Record<UserProfile, string> = {
    [UserProfile.Student]: "#FF8500",
    [UserProfile.Teacher]: "#6FBE2E",
    [UserProfile.Parent]: "#46AFE6",
    [UserProfile.Guest]: "#FF3A55",
    [UserProfile.Personnel]: "#A348C0"
};