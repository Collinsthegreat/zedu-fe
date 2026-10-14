"use client";

import React, { useContext, useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { X, LinkIcon, Copy, Check, Users, Sparkles } from "lucide-react";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { DataContext } from "~/store/GlobalState";
import { GetRequest, PostRequest } from "~/utils/new-request";
import Loading from "~/components/ui/loading";
import { showError, showSuccess } from "~/components/toast/sonner";
import { ACTIONS } from "~/store/Actions";

interface StorageOffloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSuccess: (invitedUsers: any[]) => void;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  organisation_id: string | null;
  is_default: boolean;
  permissions: {
    id: string;
    role_id: string;
    permission_list: Record<string, boolean>;
    is_default: boolean;
  };
}

export interface InviteUser {
  email: string;
  role: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const InviteModal: React.FC<StorageOffloadModalProps> = ({
  isOpen,
  onClose,
  onInviteSuccess,
}) => {
  const [roleId, setRoleId] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { state, dispatch } = useContext(DataContext);
  const { orgId, orgRoles, orgData } = state;
  const [isLinkEnabled, setIsLinkEnabled] = useState(
    orgData?.invite_link_status === "enabled"
  );

  const createOptimisticInvites = (
    emailsToInvite: string[],
    roleName: string
  ) => {
    return emailsToInvite.map((email) => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      email,
      username: "",
      phone_number: "",
      profile_url: "",
      name: "",
      role: roleName,
      status: "invited" as const,
      created_at: new Date().toISOString(),
      entity_type: "user" as const,
    }));
  };

  const getInviteLinkStatus = React.useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await GetRequest(`/invite/general/status/${orgId}`);
      if (res?.status === 200 || res?.status === 201) {
        setIsLinkEnabled(Boolean(res?.data?.data?.status));
      }
    } catch (error) {
      console.error("Failed to fetch invite link status:", error);
    }
  }, [orgId]);

  const fetchInviteLink = React.useCallback(async () => {
    if (!orgId || !roleId) return;
    try {
      const payload = {
        organisation_id: orgId,
        role_id: roleId,
      };
      const res = await PostRequest("/invite/general", payload);
      if (res?.status === 200 || res?.status === 201) {
        setInviteLink(res?.data?.data?.invitation_link || "");
      }
    } catch (error) {
      console.error("Failed to fetch invite link:", error);
    }
  }, [orgId, roleId]);

  const handleToggleInviteLink = async (checked: boolean) => {
    if (!orgId) return;
    setToggleLoading(true);
    const payload = {
      status: checked,
    };
    try {
      const res = await PostRequest("/invite/general/change-status", payload);
      if (res?.status === 200 || res?.status === 201) {
        dispatch({
          type: ACTIONS.PROFILE_CALLBACK,
          payload: state?.profileCallback,
        });
        setIsLinkEnabled(checked);
        showSuccess(
          `Invite link ${checked ? "enabled" : "disabled"} successfully`
        );
        if (checked && !inviteLink) {
          fetchInviteLink();
        }
      } else {
        showError("Failed to update invite link status");
      }
    } catch (error) {
      console.error(error);
      showError("An error occurred");
    } finally {
      setToggleLoading(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!orgId) return;
    if (!isLinkEnabled) {
      showError("The invite link is currently disabled");
      return;
    }

    try {
      let linkToCopy = inviteLink;
      if (!linkToCopy) {
        const payload = {
          organisation_id: orgId,
          role_id: roleId,
        };
        const res = await PostRequest("/invite/general", payload);
        if (res?.status === 200 || res?.status === 201) {
          linkToCopy = res?.data?.data?.invitation_link;
          setInviteLink(linkToCopy);
        } else {
          showError("Failed to generate invite link");
          return;
        }
      }

      await navigator.clipboard.writeText(linkToCopy);
      setCopied(true);
      showSuccess("Invite link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error(error);
      showError("An error occurred while copying the invite link");
    }
  };

  const addEmailChip = (emailToAdd: string) => {
    const trimmed = emailToAdd.trim().toLowerCase();
    if (!trimmed) return;

    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError(`"${trimmed}" is not a valid email address`);
      return;
    }

    if (emails.includes(trimmed)) {
      setEmailError(`"${trimmed}" has already been added`);
      return;
    }

    setEmails((prev) => [...prev, trimmed]);
    setEmailInput("");
    setEmailError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      if (emailInput.trim()) {
        addEmailChip(emailInput);
      }
    } else if (e.key === "Backspace" && !emailInput && emails.length > 0) {
      e.preventDefault();
      setEmails((prev) => prev.slice(0, -1));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const rawEmails = pasted.split(/[\s,;]+/);
    const validToAdd: string[] = [];
    let hasInvalid = false;

    rawEmails.forEach((raw) => {
      const trimmed = raw.trim().toLowerCase();
      if (trimmed) {
        if (EMAIL_REGEX.test(trimmed)) {
          if (!emails.includes(trimmed) && !validToAdd.includes(trimmed)) {
            validToAdd.push(trimmed);
          }
        } else {
          hasInvalid = true;
        }
      }
    });

    if (validToAdd.length > 0) {
      setEmails((prev) => [...prev, ...validToAdd]);
      setEmailInput("");
    }

    if (hasInvalid) {
      setEmailError(
        "Some pasted items were skipped because they were not valid email addresses"
      );
    } else {
      setEmailError(null);
    }
  };

  const removeEmailChip = (indexToRemove: number) => {
    setEmails((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSendInvitations = async () => {
    // If user has pending text in the input that is valid, add it first
    let currentEmails = [...emails];
    if (emailInput.trim()) {
      const trimmed = emailInput.trim().toLowerCase();
      if (EMAIL_REGEX.test(trimmed) && !currentEmails.includes(trimmed)) {
        currentEmails = [...currentEmails, trimmed];
        setEmails(currentEmails);
        setEmailInput("");
      } else if (!EMAIL_REGEX.test(trimmed)) {
        setEmailError("Please finish typing or remove the invalid email");
        return;
      }
    }

    if (!orgId || !roleId || currentEmails.length === 0) return;

    setButtonLoading(true);

    const payload = {
      org_id: orgId,
      emails: currentEmails,
      role_id: roleId,
    };

    try {
      const res = await PostRequest("/invite", payload);
      if (res?.status === 200 || res?.status === 201) {
        showSuccess(res?.data?.message || "Invitations sent successfully");

        if (onInviteSuccess) {
          const roleName =
            roles?.find((role) => role.id === roleId)?.name || "Member";
          const optimisticInvites = createOptimisticInvites(
            currentEmails,
            roleName
          );
          onInviteSuccess(optimisticInvites);
        }

        setEmails([]);
        setEmailInput("");
        onClose();
      } else {
        showError(res?.data?.message || "Failed to send invitations");
      }
    } catch (error) {
      console.error(error);
      showError("An error occurred while sending invitations");
    } finally {
      setButtonLoading(false);
    }
  };

  useEffect(() => {
    setRoles(orgRoles || []);
    const defaultRole =
      orgRoles?.find((item: Role) => item?.is_default) ||
      orgRoles?.find(
        (item: Role) => item?.name === "User" || item?.name === "Member"
      );
    if (defaultRole) {
      setRoleId(defaultRole.id);
    }
    if (isOpen) {
      getInviteLinkStatus();
      setEmails([]);
      setEmailInput("");
      setEmailError(null);
    }
  }, [orgId, isOpen, orgRoles, getInviteLinkStatus]);

  useEffect(() => {
    if (isOpen && orgId && roleId && isLinkEnabled) {
      fetchInviteLink();
    }
  }, [isOpen, orgId, roleId, isLinkEnabled, fetchInviteLink]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="backdrop-blur-sm bg-black/40 z-50">
        <DialogContent className="sm:max-w-xl bg-white dark:bg-[#1A1D21] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 p-0 overflow-hidden z-50">
          <div className="relative flex flex-col">
            {/* Header */}
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#7141F8] flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                      Invite people to {orgData?.name || "Workspace"}
                    </DialogTitle>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                      Send batch invitations via email or share an instant
                      workspace link
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full w-8 h-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </DialogHeader>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Dedicated Link Sharing Section */}
              <div className="p-4 rounded-xl border border-purple-100 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-[#7141F8]" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                      Invite link
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-zinc-400">
                      {isLinkEnabled ? "Link active" : "Link disabled"}
                    </span>
                    <Switch
                      checked={isLinkEnabled}
                      onCheckedChange={handleToggleInviteLink}
                      disabled={toggleLoading}
                      aria-label="Toggle invite link"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      readOnly
                      value={
                        isLinkEnabled
                          ? inviteLink || "Generating invite link..."
                          : "Invite link is currently disabled"
                      }
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111315] text-xs text-gray-600 dark:text-zinc-300 font-mono truncate outline-none select-all"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyInviteLink}
                    disabled={!isLinkEnabled || toggleLoading}
                    className="h-9 shrink-0 gap-1.5 border-[#7141F8]/30 text-[#7141F8] hover:bg-purple-50 dark:hover:bg-purple-950/40"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs text-emerald-600 font-semibold">
                          Copied
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold">Copy link</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Multi-Email Chip Input & Role Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                    Invite by Email
                  </Label>
                  <span className="text-xs text-gray-500 dark:text-zinc-400">
                    Press{" "}
                    <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-[10px] font-mono">
                      Enter
                    </kbd>{" "}
                    or{" "}
                    <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-[10px] font-mono">
                      ,
                    </kbd>{" "}
                    to add
                  </span>
                </div>

                {/* Email Chips Container */}
                <div
                  className="min-h-[96px] p-2.5 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#111315] flex flex-wrap items-center content-start gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-[#7141F8]/20 focus-within:border-[#7141F8]"
                  onClick={() => inputRef.current?.focus()}
                >
                  {emails.map((email, idx) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-xs text-[#7141F8] dark:text-purple-300 font-medium"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEmailChip(idx);
                        }}
                        className="rounded hover:bg-purple-200/60 dark:hover:bg-purple-800/60 p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={inputRef}
                    type="text"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onBlur={() => {
                      if (emailInput.trim()) {
                        addEmailChip(emailInput);
                      }
                    }}
                    placeholder={
                      emails.length === 0
                        ? "Enter email addresses (e.g. name@company.com)..."
                        : "Add more emails..."
                    }
                    className="flex-1 min-w-[180px] h-7 bg-transparent text-xs text-gray-900 dark:text-zinc-100 outline-none placeholder:text-gray-400"
                  />
                </div>

                {emailError && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {emailError}
                  </p>
                )}

                {/* Role Assignment Selector */}
                <div className="flex items-center justify-between pt-1">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium text-gray-700 dark:text-zinc-300">
                      Assign Role
                    </Label>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                      Applies to all members invited in this batch
                    </p>
                  </div>

                  <div className="w-48">
                    <Select value={roleId} onValueChange={setRoleId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles && roles.length > 0 ? (
                          roles.map((r) => (
                            <SelectItem
                              key={r.id}
                              value={r.id}
                              className="text-xs"
                            >
                              {r.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="user" className="text-xs">
                            Member
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Streamlined Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-[#16181B]">
              <span className="text-xs text-gray-500 dark:text-zinc-400">
                {emails.length} {emails.length === 1 ? "person" : "people"}{" "}
                selected
              </span>

              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="h-9 px-4 text-xs font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSendInvitations}
                  disabled={
                    (emails.length === 0 && !emailInput.trim()) ||
                    buttonLoading ||
                    !roleId
                  }
                  className="h-9 px-5 bg-[#7141F8] hover:bg-[#5E2DE0] text-white text-xs font-semibold gap-2 shadow-sm"
                >
                  {buttonLoading ? (
                    <>
                      <Loading width="14" height="14" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send invitations</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </DialogOverlay>
    </Dialog>
  );
};

export default InviteModal;
