const activeNotifications = new Map<string, Notification>();

export function showCallNotification(params: {
  callerName: string;
  avatarUrl?: string;
  buzzId: string;
}): void {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    Notification.permission !== "granted" ||
    document.visibilityState === "visible"
  ) {
    return;
  }

  try {
    const notif = new Notification(`${params.callerName} is buzzing you!`, {
      body: "Click to join the buzz",
      icon: typeof params.avatarUrl === "string" ? params.avatarUrl : undefined,
      tag: params.buzzId ? `buzz-${params.buzzId}` : "buzz-call",
      requireInteraction: true,
    });

    const key = params.buzzId || "default";
    activeNotifications.set(key, notif);

    notif.onclick = () => {
      window.focus();
      notif.close();
      activeNotifications.delete(key);
    };

    notif.onclose = () => {
      activeNotifications.delete(key);
    };
  } catch {
    // Ignore browser notification errors
  }
}

export function closeCallNotification(buzzId?: string): void {
  if (buzzId && activeNotifications.has(buzzId)) {
    try {
      activeNotifications.get(buzzId)?.close();
    } catch {
      // Ignore close errors
    }
    activeNotifications.delete(buzzId);
    return;
  }

  activeNotifications.forEach((notif) => {
    try {
      notif.close();
    } catch {
      // Ignore close errors
    }
  });
  activeNotifications.clear();
}
