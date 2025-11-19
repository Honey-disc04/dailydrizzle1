import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "./firebase";
import { db } from "./firebase";
import { collection, addDoc, query, where, getDocs, updateDoc, doc, Timestamp, orderBy, limit } from "firebase/firestore";

// Initialize Firebase App (avoid duplicate initialization)
let messaging: any = null;
try {
  const app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
} catch (error) {
  console.log('Firebase already initialized');
}

export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  category?: string;
}

export interface StoredNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'breaking_news' | 'digest' | 'category_update' | 'system';
  category?: string;
  article_url?: string;
  read: boolean;
  created_at: string;
}

class NotificationService {
  getPermission() {
    throw new Error('Method not implemented.');
  }
  private permission: NotificationPermission = "default";

  constructor() {
    if ("Notification" in window) {
      this.permission = Notification.permission;
    }
  }

  // Request browser notification permission
  async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    if (this.permission === "granted") return true;
    if (this.permission === "denied") return false;

    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission === "granted";
  }

  // Show browser notification
  async showBrowserNotification(data: NotificationData): Promise<void> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) return;

    const notification = new Notification(data.title, {
      body: data.body,
      icon: data.icon || "/favicon.ico",
      tag: data.category || "news",
    });

    notification.onclick = () => {
      if (data.url) window.open(data.url, "_blank");
      notification.close();
    };

    setTimeout(() => notification.close(), 10000);
  }

  // Store notification in Firestore
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: 'breaking_news' | 'digest' | 'category_update' | 'system',
    category?: string,
    articleUrl?: string
  ): Promise<void> {
    if (!userId) {
      console.error('❌ No userId provided');
      return;
    }

    console.log('📝 Creating notification:', { userId, title, type });

    try {
      const notificationData = {
        user_id: userId,
        title: title,
        message: message,
        type: type,
        category: category || null,
        article_url: articleUrl || null,
        read: false,
        created_at: Timestamp.now()
      };

      console.log('📦 Notification data:', notificationData);

      const docRef = await addDoc(collection(db, 'notifications'), notificationData);
      console.log('✅ Notification created with ID:', docRef.id);
    } catch (error) {
      console.error('❌ Error storing notification:', error);
      throw error;
    }
  }

  // Get user notifications
  async getUserNotifications(userId: string, limitCount: number = 20): Promise<StoredNotification[]> {
    if (!userId) {
      console.error('❌ No userId provided');
      return [];
    }

    console.log('🔍 Fetching notifications for user:', userId);

    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('user_id', '==', userId),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      console.log('📊 Found notifications:', snapshot.size);

      const notifications: StoredNotification[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          user_id: data.user_id,
          title: data.title,
          message: data.message,
          type: data.type,
          category: data.category,
          article_url: data.article_url,
          read: data.read,
          created_at: data.created_at.toDate().toISOString()
        });
      });

      console.log('✅ Notifications loaded:', notifications.length);
      return notifications;
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      return [];
    }
  }

  // Get unread notification count
  async getUnreadCount(userId: string): Promise<number> {
    if (!userId) return 0;

    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('user_id', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('❌ Error fetching unread count:', error);
      return 0;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true
      });
      console.log('✅ Notification marked as read:', notificationId);
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('user_id', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      
      const updatePromises = snapshot.docs.map(document => 
        updateDoc(doc(db, 'notifications', document.id), { read: true })
      );

      await Promise.all(updatePromises);
      console.log('✅ All notifications marked as read');
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
    }
  }

  // Notify about new article (combines browser + Firestore)
  async notifyNewArticle(
    userId: string,
    title: string, 
    category: string,
    articleUrl?: string
  ): Promise<void> {
    console.log('📰 Notifying about new article:', { userId, title, category });

    // Show browser notification
    await this.showBrowserNotification({
      title: `New article in ${category}`,
      body: title,
      icon: '/favicon.ico',
      category: category,
      url: articleUrl
    });

    // Store in Firestore
    await this.createNotification(
      userId,
      `New article in ${category}`,
      title,
      'category_update',
      category,
      articleUrl
    );
  }
  
  // Send breaking news alert
  async sendBreakingNews(
    userId: string,
    message: string,
    articleUrl?: string
  ): Promise<void> {
    await this.showBrowserNotification({
      title: '🚨 Breaking News',
      body: message,
      icon: '/favicon.ico',
      url: articleUrl
    });

    await this.createNotification(
      userId,
      '🚨 Breaking News',
      message,
      'breaking_news',
      undefined,
      articleUrl
    );
  }

  // Send daily digest notification
  async sendDailyDigest(
    userId: string,
    articleCount: number
  ): Promise<void> {
    const message = `Your personalized news summary is ready with ${articleCount} new articles`;

    await this.showBrowserNotification({
      title: 'Daily News Digest',
      body: message,
      icon: '/favicon.ico'
    });

    await this.createNotification(
      userId,
      'Daily News Digest',
      message,
      'digest'
    );
  }

  // Get FCM token (for push notifications)
  async getFCMToken(): Promise<string | null> {
    if (!messaging) return null;

    try {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      });
      if (token) {
        console.log("FCM Token:", token);
        return token;
      } else {
        console.warn("No FCM token retrieved.");
        return null;
      }
    } catch (error) {
      console.error("Error getting FCM token:", error);
      return null;
    }
  }

  // Listen for FCM push messages
  listenForMessages(): void {
    if (!messaging) return;

    onMessage(messaging, (payload) => {
      console.log("FCM Message received:", payload);

      const { notification, fcmOptions } = payload;
      if (notification) {
        this.showBrowserNotification({
          title: notification.title || "DailyDrizzle",
          body: notification.body || "New update",
          icon: notification.icon,
          url: fcmOptions?.link,
        });
      }
    });
  }
}

export const notificationService = new NotificationService();