import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/chat_models.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_client.dart';
import '../../services/chat_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/shared_widgets.dart';

class CareChatScreen extends StatefulWidget {
  const CareChatScreen({super.key});

  @override
  State<CareChatScreen> createState() => _CareChatScreenState();
}

class _CareChatScreenState extends State<CareChatScreen> {
  final _service = ChatService();
  final _messageCtrl = TextEditingController();
  final _doctorCodeCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  StreamSubscription<ChatMessage>? _messageSubscription;

  List<ChatContact> _contacts = [];
  List<ChatThread> _threads = [];
  List<ChatMessage> _messages = [];
  ChatThread? _selectedThread;
  bool _isLoading = true;
  bool _isSending = false;
  bool _isConnecting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadChat());
  }

  @override
  void dispose() {
    _messageSubscription?.cancel();
    _messageCtrl.dispose();
    _doctorCodeCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadChat() async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final contacts = await _service.fetchContacts(token);
      final threads = await _service.fetchThreads(token);
      if (!mounted) return;
      setState(() {
        _contacts = contacts;
        _threads = threads;
        _isLoading = false;
      });
      if (threads.isNotEmpty && _selectedThread == null) {
        await _selectThread(threads.first);
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Unable to load chat right now.';
        _isLoading = false;
      });
    }
  }

  Future<void> _startThread(ChatContact contact) async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    try {
      final currentRole = context.read<AuthProvider>().role ?? 'patient';
      ChatThread? existing;
      for (final thread in _threads) {
        if (thread.otherParticipant(currentRole).userId == contact.userId) {
          existing = thread;
          break;
        }
      }

      final thread = existing ??
          await _service.createThread(token: token, userId: contact.userId);
      if (!mounted) return;

      if (existing == null) {
        setState(() => _threads = [thread, ..._threads]);
      }
      await _selectThread(thread);
    } on ApiException catch (e) {
      _showSnack(e.message);
    } catch (_) {
      _showSnack('Could not open that conversation.');
    }
  }

  Future<void> _selectThread(ChatThread thread) async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    setState(() {
      _selectedThread = thread;
      _messages = [];
      _error = null;
    });
    await _messageSubscription?.cancel();

    try {
      final messages = await _service.fetchMessages(
        token: token,
        threadId: thread.id,
      );
      if (!mounted) return;
      setState(() => _messages = messages);
      _scrollToBottom();
      _messageSubscription = _service
          .streamMessages(token: token, threadId: thread.id)
          .listen(_appendMessage, onError: (_) {
        if (mounted) {
          setState(() => _error = 'Live updates paused. Pull to refresh.');
        }
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Unable to load messages.');
    }
  }

  Future<void> _sendMessage() async {
    final token = context.read<AuthProvider>().token;
    final thread = _selectedThread;
    final text = _messageCtrl.text.trim();
    if (token == null || thread == null || text.isEmpty || _isSending) return;

    setState(() => _isSending = true);
    _messageCtrl.clear();
    try {
      final message = await _service.sendMessage(
        token: token,
        threadId: thread.id,
        body: text,
      );
      _appendMessage(message);
    } on ApiException catch (e) {
      _showSnack(e.message);
    } catch (_) {
      _showSnack('Message could not be sent.');
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  Future<void> _connectDoctor() async {
    final token = context.read<AuthProvider>().token;
    final code = _doctorCodeCtrl.text.trim();
    if (token == null || code.length != 6 || _isConnecting) {
      _showSnack('Enter the 6 digit doctor code.');
      return;
    }

    setState(() => _isConnecting = true);
    try {
      await _service.verifyConnection(token: token, code: code);
      _doctorCodeCtrl.clear();
      _showSnack('Doctor connected successfully.');
      await _loadChat();
    } on ApiException catch (e) {
      _showSnack(e.message);
    } catch (_) {
      _showSnack('Could not connect to doctor.');
    } finally {
      if (mounted) setState(() => _isConnecting = false);
    }
  }

  void _appendMessage(ChatMessage message) {
    if (!mounted || _messages.any((item) => item.id == message.id)) return;
    setState(() => _messages = [..._messages, message]);
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollCtrl.hasClients) return;
      _scrollCtrl.animateTo(
        _scrollCtrl.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final role = auth.role ?? auth.user?.role ?? 'patient';
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final txtSec = isDark ? AppTheme.darkTextSecondary : AppTheme.textSecondary;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: const SessionAppTopBar(hideProfileMenu: true),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            color: theme.appBarTheme.backgroundColor,
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Care Chat',
                  style: GoogleFonts.dmSans(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: theme.textTheme.headlineMedium?.color,
                  ),
                ),
                Text(
                  role == 'doctor'
                      ? 'Message your patients securely'
                      : 'Message verified doctors securely',
                  style: GoogleFonts.dmSans(fontSize: 13, color: txtSec),
                ),
              ],
            ),
          ),
          if (_error != null)
            Container(
              width: double.infinity,
              color: AppTheme.warning.withOpacity(0.12),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Text(
                _error!,
                style: GoogleFonts.dmSans(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.warning,
                ),
              ),
            ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : LayoutBuilder(
                    builder: (context, constraints) {
                      final isWide = constraints.maxWidth >= 820;
                      final contacts = _mergeContacts(role);
                      if (isWide) {
                        return Row(
                          children: [
                            SizedBox(
                              width: 330,
                              child: _ContactsPane(
                                contacts: contacts,
                                selectedThread: _selectedThread,
                                role: role,
                                onTap: _startThread,
                              ),
                            ),
                            VerticalDivider(
                              width: 1,
                              color: isDark
                                  ? AppTheme.darkBorderColor
                                  : AppTheme.borderColor,
                            ),
                            Expanded(child: _conversationPane(role: role)),
                          ],
                        );
                      }

                      return Column(
                        children: [
                          SizedBox(
                            height: 116,
                            child: _ContactsStrip(
                              contacts: contacts,
                              selectedThread: _selectedThread,
                              role: role,
                              onTap: _startThread,
                            ),
                          ),
                          Divider(
                            height: 1,
                            color: isDark
                                ? AppTheme.darkBorderColor
                                : AppTheme.borderColor,
                          ),
                          Expanded(child: _conversationPane(role: role)),
                        ],
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  List<ChatContact> _mergeContacts(String role) {
    final byUserId = <int, ChatContact>{};
    for (final contact in _contacts) {
      byUserId[contact.userId] = contact;
    }
    for (final thread in _threads) {
      final contact = thread.otherParticipant(role);
      byUserId[contact.userId] = contact;
    }
    return byUserId.values.toList()
      ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
  }

  Widget _conversationPane({required String role}) {
    final auth = context.watch<AuthProvider>();
    final thread = _selectedThread;
    if (thread == null) {
      if (role == 'patient') {
        return _PatientConnectCard(
          controller: _doctorCodeCtrl,
          isConnecting: _isConnecting,
          onConnect: _connectDoctor,
        );
      }
      return _EmptyConversation(
        icon: Icons.forum_outlined,
        title: 'Select a conversation',
        message: role == 'doctor'
            ? 'Choose a patient to start messaging.'
            : 'Choose a doctor to start messaging.',
      );
    }

    final other = thread.otherParticipant(role);
    return Column(
      children: [
        _ConversationHeader(contact: other),
        Expanded(
          child: _messages.isEmpty
              ? const _EmptyConversation(
                  icon: Icons.chat_bubble_outline,
                  title: 'No messages yet',
                  message: 'Send the first message when you are ready.',
                )
              : ListView.builder(
                  controller: _scrollCtrl,
                  padding: const EdgeInsets.all(16),
                  itemCount: _messages.length,
                  itemBuilder: (context, index) {
                    final message = _messages[index];
                    return _DirectMessageBubble(
                      message: message,
                      isMine: message.senderUserId == auth.user?.id,
                    );
                  },
                ),
        ),
        SafeArea(
          top: false,
          child: Container(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
            decoration: BoxDecoration(
              color: Theme.of(context).cardTheme.color,
              border: Border(
                top: BorderSide(
                  color: Theme.of(context).brightness == Brightness.dark
                      ? AppTheme.darkBorderColor
                      : AppTheme.borderColor,
                ),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageCtrl,
                    minLines: 1,
                    maxLines: 4,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _sendMessage(),
                    decoration: const InputDecoration(
                      hintText: 'Write a message...',
                      prefixIcon: Icon(Icons.lock_outline, size: 18),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  width: 46,
                  height: 46,
                  child: ElevatedButton(
                    onPressed: _isSending ? null : _sendMessage,
                    style: ElevatedButton.styleFrom(
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _isSending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.send, size: 18),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _PatientConnectCard extends StatelessWidget {
  final TextEditingController controller;
  final bool isConnecting;
  final VoidCallback onConnect;

  const _PatientConnectCard({
    required this.controller,
    required this.isConnecting,
    required this.onConnect,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final txtSec = isDark ? AppTheme.darkTextSecondary : AppTheme.textSecondary;

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 440),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: theme.cardTheme.color,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? AppTheme.darkBorderColor : AppTheme.borderColor,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.medical_information_outlined,
                  size: 42, color: AppTheme.primary),
              const SizedBox(height: 14),
              Text(
                'Connect with your doctor to start chatting.',
                textAlign: TextAlign.center,
                style: GoogleFonts.dmSans(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: theme.textTheme.titleLarge?.color,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Enter the SMS code sent by your doctor.',
                textAlign: TextAlign.center,
                style: GoogleFonts.dmSans(fontSize: 13, color: txtSec),
              ),
              const SizedBox(height: 18),
              TextField(
                controller: controller,
                keyboardType: TextInputType.number,
                maxLength: 6,
                textAlign: TextAlign.center,
                style: GoogleFonts.dmSans(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 2,
                ),
                decoration: const InputDecoration(
                  labelText: 'Doctor Code',
                  counterText: '',
                  prefixIcon: Icon(Icons.password_outlined),
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: isConnecting ? null : onConnect,
                  icon: isConnecting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.link_outlined),
                  label: Text(isConnecting ? 'Connecting...' : 'Connect'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ContactsPane extends StatelessWidget {
  final List<ChatContact> contacts;
  final ChatThread? selectedThread;
  final String role;
  final ValueChanged<ChatContact> onTap;

  const _ContactsPane({
    required this.contacts,
    required this.selectedThread,
    required this.role,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final txtSec = theme.brightness == Brightness.dark
        ? AppTheme.darkTextSecondary
        : AppTheme.textSecondary;

    return Container(
      color: theme.cardTheme.color,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              role == 'doctor' ? 'Patients' : 'Doctors',
              style: GoogleFonts.dmSans(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: theme.textTheme.titleLarge?.color,
              ),
            ),
          ),
          Expanded(
            child: contacts.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        'No contacts available',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.dmSans(color: txtSec),
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                    itemCount: contacts.length,
                    itemBuilder: (context, index) {
                      final contact = contacts[index];
                      return _ContactTile(
                        contact: contact,
                        isSelected: _isContactSelected(
                          selectedThread,
                          contact,
                          role,
                        ),
                        onTap: () => onTap(contact),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _ContactsStrip extends StatelessWidget {
  final List<ChatContact> contacts;
  final ChatThread? selectedThread;
  final String role;
  final ValueChanged<ChatContact> onTap;

  const _ContactsStrip({
    required this.contacts,
    required this.selectedThread,
    required this.role,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (contacts.isEmpty) {
      return const Center(child: Text('No contacts available'));
    }
    return ListView.separated(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.all(12),
      itemBuilder: (context, index) {
        final contact = contacts[index];
        return SizedBox(
          width: 170,
          child: _ContactTile(
            contact: contact,
            isSelected: _isContactSelected(selectedThread, contact, role),
            onTap: () => onTap(contact),
            compact: true,
          ),
        );
      },
      separatorBuilder: (_, __) => const SizedBox(width: 10),
      itemCount: contacts.length,
    );
  }
}

class _ContactTile extends StatelessWidget {
  final ChatContact contact;
  final bool isSelected;
  final bool compact;
  final VoidCallback onTap;

  const _ContactTile({
    required this.contact,
    required this.isSelected,
    required this.onTap,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final txtSec = isDark ? AppTheme.darkTextSecondary : AppTheme.textSecondary;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.primary.withOpacity(isDark ? 0.18 : 0.1)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? AppTheme.primary.withOpacity(0.45)
                : (isDark ? AppTheme.darkBorderColor : AppTheme.borderColor),
          ),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: compact ? 18 : 21,
              backgroundColor: AppTheme.primary,
              child: Text(
                contact.initials,
                style: GoogleFonts.dmSans(
                  fontSize: compact ? 12 : 13,
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    contact.name.isEmpty ? contact.email : contact.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.dmSans(
                      fontSize: compact ? 13 : 14,
                      fontWeight: FontWeight.w700,
                      color: theme.textTheme.bodyLarge?.color,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    contact.subtitle.isEmpty ? contact.role : contact.subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.dmSans(fontSize: 12, color: txtSec),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ConversationHeader extends StatelessWidget {
  final ChatContact contact;

  const _ConversationHeader({required this.contact});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final txtSec = isDark ? AppTheme.darkTextSecondary : AppTheme.textSecondary;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: theme.cardTheme.color,
        border: Border(
          bottom: BorderSide(
            color: isDark ? AppTheme.darkBorderColor : AppTheme.borderColor,
          ),
        ),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: AppTheme.primary,
            child: Text(
              contact.initials,
              style: GoogleFonts.dmSans(
                color: Colors.white,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  contact.name.isEmpty ? contact.email : contact.name,
                  style: GoogleFonts.dmSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: theme.textTheme.titleMedium?.color,
                  ),
                ),
                Text(
                  contact.email,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.dmSans(fontSize: 12, color: txtSec),
                ),
              ],
            ),
          ),
          const Icon(Icons.verified_user_outlined, color: AppTheme.primary),
        ],
      ),
    );
  }
}

class _DirectMessageBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isMine;

  const _DirectMessageBubble({
    required this.message,
    required this.isMine,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final bg = isMine
        ? AppTheme.primary
        : (isDark ? AppTheme.darkRowBg : const Color(0xFFF3F3F5));
    final fg = isMine
        ? Colors.white
        : (isDark ? AppTheme.darkTextPrimary : AppTheme.textPrimary);
    final metaColor = isMine
        ? Colors.white70
        : (isDark ? AppTheme.darkTextSecondary : AppTheme.textSecondary);

    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 620),
        margin: const EdgeInsets.symmetric(vertical: 5),
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(16).copyWith(
            bottomRight: isMine ? const Radius.circular(4) : null,
            bottomLeft: isMine ? null : const Radius.circular(4),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              message.body,
              style: GoogleFonts.dmSans(fontSize: 14, color: fg, height: 1.35),
            ),
            const SizedBox(height: 5),
            Text(
              _formatMessageTime(message.createdAt),
              style: GoogleFonts.dmSans(fontSize: 11, color: metaColor),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyConversation extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;

  const _EmptyConversation({
    required this.icon,
    required this.title,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final txtSec = isDark ? AppTheme.darkTextSecondary : AppTheme.textSecondary;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 44, color: AppTheme.primary),
            const SizedBox(height: 12),
            Text(
              title,
              style: GoogleFonts.dmSans(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: theme.textTheme.titleLarge?.color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              message,
              textAlign: TextAlign.center,
              style: GoogleFonts.dmSans(fontSize: 13, color: txtSec),
            ),
          ],
        ),
      ),
    );
  }
}

bool _isContactSelected(
  ChatThread? selectedThread,
  ChatContact contact,
  String role,
) {
  if (selectedThread == null) return false;
  return selectedThread.otherParticipant(role).userId == contact.userId;
}

String _formatMessageTime(DateTime? date) {
  if (date == null) return '';
  return DateFormat.jm().format(date.toLocal());
}
