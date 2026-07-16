import { StyleSheet } from 'react-native';

const COLORS = {
  primary: '#DC143C',
  primaryDark: '#B01030',
  secondary: '#4A5568',
  background: '#F7FAFC',
  white: '#FFFFFF',
  black: '#1A202C',
  gray: '#A0AEC0',
  lightGray: '#E2E8F0',
  darkGray: '#718096',
  success: '#38A169',
  error: '#E53E3E',
  warning: '#D69E2E',
  pending: '#ECC94B',
  resolved: '#38A169',
  active: '#E53E3E',
  cancelled: '#A0AEC0',
  text: '#1A202C',
  textSecondary: '#718096',
  border: '#E2E8F0',
  card: '#FFFFFF',
  sosRed: '#DC143C',
  sosGreen: '#38A169',
};

export { COLORS };

export default StyleSheet.create({
  // ============= GLOBAL =============
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },

  // ============= HEADER =============
  appHeader: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  appHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 2,
  },
  appHeaderSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 4,
  },
  screenHeader: {
    backgroundColor: COLORS.primary,
    paddingTop: 45,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  screenHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: 15,
  },
  backButton: {
    padding: 5,
  },

  // ============= FORM =============
  formContent: {
    padding: 20,
    paddingTop: 30,
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: COLORS.white,
    color: COLORS.text,
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: COLORS.white,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: COLORS.error,
  },

  // ============= BUTTONS =============
  btn: {
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  btnSecondary: {
    backgroundColor: COLORS.secondary,
  },
  btnWhite: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnSosLarge: {
    backgroundColor: COLORS.sosRed,
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 20,
    elevation: 8,
    shadowColor: COLORS.sosRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  btnSosCircle: {
    backgroundColor: COLORS.sosRed,
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    elevation: 10,
    shadowColor: COLORS.sosRed,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  btnTextWhite: {
    color: COLORS.white,
  },
  btnTextDark: {
    color: COLORS.text,
  },

  // ============= AUTH =============
  authContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: 24,
  },
  authLogo: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  textCenter: {
    textAlign: 'center',
    marginTop: 16,
  },
  forgotPassword: {
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },

  // ============= HOME =============
  homeHeader: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
  },
  logoutBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 8,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  homeSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.85,
  },
  homeContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  homeBtnSos: {
    backgroundColor: COLORS.sosRed,
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 30,
    elevation: 6,
    shadowColor: COLORS.sosRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  homeBtnSosText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
  },
  homeBtn: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginVertical: 6,
  },
  homeBtnText: {
    fontSize: 18,
    fontWeight: '600',
  },

  // ============= SOS =============
  sosContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sosText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 20,
    textAlign: 'center',
  },
  sosSuccessContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  sosSuccessIcon: {
    marginBottom: 12,
  },
  sosSuccessText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.sosGreen,
    marginBottom: 8,
  },
  sosSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  sosCancelBtn: {
    marginTop: 20,
    padding: 12,
  },
  sosCancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  sosSmallCancelBtn: {
    backgroundColor: COLORS.white,
    padding: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  sosSmallCancelText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '600',
  },

  // ============= COMPLAINT LIST ITEM =============
  complaintItem: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  complaintInfo: {
    flex: 1,
    gap: 4,
  },
  caseId: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  statusPending: {
    backgroundColor: '#FEFCBF',
    color: '#744210',
  },
  statusResolved: {
    backgroundColor: '#C6F6D5',
    color: '#22543D',
  },
  statusActive: {
    backgroundColor: '#FED7D7',
    color: '#9B2C2C',
  },
  statusCancelled: {
    backgroundColor: '#E2E8F0',
    color: '#4A5568',
  },
  caseDetailCard: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    margin: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: COLORS.black,
  },
  attachmentImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 6,
  },

  // ============= CHATBOT =============
  chatbotFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: COLORS.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 999,
  },
  chatbotPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: COLORS.white,
    zIndex: 1000,
  },
  chatbotHeader: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatbotHeaderText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  chatbotCloseBtn: {
    padding: 5,
  },
  chatbotCloseText: {
    color: COLORS.white,
    fontSize: 24,
  },
  chatbotMessages: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F7FAFC',
  },
  chatMsg: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  chatMsgBot: {
    backgroundColor: '#E2E8F0',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  chatMsgUser: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  chatMsgBotText: {
    color: COLORS.black,
    fontSize: 15,
  },
  chatMsgUserText: {
    color: COLORS.white,
    fontSize: 15,
  },
  chatbotSuggestions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  suggestionBtn: {
    backgroundColor: '#EDF2F7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  suggestionBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  chatbotInputRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  chatbotInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#F7FAFC',
    marginRight: 10,
  },
  chatbotSendBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  chatbotSendText: {
    color: COLORS.white,
    fontWeight: '600',
  },

  // ============= LOADER =============
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loaderCard: {
    backgroundColor: COLORS.white,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 8,
  },
  loaderSpinner: {
    width: 40,
    height: 40,
    borderWidth: 4,
    borderColor: COLORS.border,
    borderTopColor: COLORS.primary,
    borderRadius: 20,
    marginBottom: 12,
  },
  loaderText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  // ============= TOAST =============
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 10,
    zIndex: 99999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  toastSuccess: {
    backgroundColor: COLORS.success,
  },
  toastError: {
    backgroundColor: COLORS.error,
  },
  toastText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ============= EMPTY STATE =============
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 4,
  },

  // ============= MISC =============
  mapLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});