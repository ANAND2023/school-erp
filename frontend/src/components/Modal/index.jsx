import { AppModal } from '../common/AppModal';

/**
 * Universal Modal component - alias for AppModal.
 * Provides a single unified modal across the entire application:
 * - Top Header: Left title, Top-right cancel (close) button
 * - Middle: Children content
 * - Bottom Footer: 2 action buttons (Cancel + Submit/Save)
 */
export const Modal = AppModal;
export default AppModal;
