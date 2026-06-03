import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/shared_widgets.dart';

class DoctorChatbotScreen extends StatefulWidget {
  const DoctorChatbotScreen({super.key});

  @override
  State<DoctorChatbotScreen> createState() => _DoctorChatbotScreenState();
}

class _DoctorChatbotScreenState extends State<DoctorChatbotScreen> {
  final _scrollCtrl = ScrollController();
  final _messageCtrl = TextEditingController();
  bool _isTyping = false;

  final List<Map<String, dynamic>> _messages = [
    {
      'text': "Hello Dr. Anderson! I'm your AI medical assistant. I can help you analyze X-ray results, compare patient scans, suggest treatment protocols, and clarify medical terminology. How can I assist you today?",
      'isUser': false,
      'time': '02:17 PM',
    },
  ];

  final _quickQuestions = [
    'Explain this AI result',
    'Compare to previous X-ray',
    'What treatment steps should be considered?',
    'Interpret the confidence scores',
  ];

  void _sendMessage([String? preset]) {
    final text = preset ?? _messageCtrl.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _messages.add({'text': text, 'isUser': true, 'time': _timeNow()});
      _isTyping = true;
      _messageCtrl.clear();
    });

    _scrollToBottom();

    Future.delayed(const Duration(milliseconds: 1500), () {
      if (!mounted) return;
      setState(() {
        _isTyping = false;
        _messages.add({
          'text': _getResponse(text),
          'isUser': false,
          'time': _timeNow(),
        });
      });
      _scrollToBottom();
    });
  }

  String _getResponse(String q) {
    if (q.toLowerCase().contains('pneumonia')) {
      return "Based on the X-ray analysis, the AI detected consolidation in the lower right lobe with 93% confidence. The pattern is consistent with bacterial pneumonia. Recommend antibiotic therapy and follow-up in 2 weeks.";
    } else if (q.toLowerCase().contains('treatment')) {
      return "For this case, I recommend: 1) Empiric antibiotic therapy with amoxicillin-clavulanate, 2) Chest physiotherapy, 3) Follow-up X-ray in 4-6 weeks, 4) Refer to pulmonologist if no improvement.";
    } else if (q.toLowerCase().contains('compare')) {
      return "Comparing to the previous X-ray from 3 months ago: The current scan shows 40% improvement in the affected area. The consolidation has significantly reduced, indicating effective treatment response.";
    } else if (q.toLowerCase().contains('confidence')) {
      return "The AI confidence scores indicate: 93% confidence in Pneumonia diagnosis, 5% Normal, 2% Other conditions. Scores above 85% are considered high confidence. Always correlate with clinical findings.";
    }
    return "I've analyzed your query. Based on the available medical data and AI analysis, I recommend consulting the detailed report for specific findings. The AI system has processed the scan with high accuracy. Would you like me to elaborate on any specific aspect?";
  }

  String _timeNow() {
    final now = DateTime.now();
    final h = now.hour > 12 ? now.hour - 12 : now.hour;
    final m = now.minute.toString().padLeft(2, '0');
    final period = now.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $period';
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _scrollCtrl.dispose();
    _messageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final txtSec = isDark ? AppTheme.darkTextSecondary : AppTheme.textSecondary;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: const SessionAppTopBar(),
      body: Column(
        children: [
          // Header
          Container(
            color: theme.appBarTheme.backgroundColor,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('AI Medical Assistant', style: GoogleFonts.dmSans(
                  fontSize: 22, 
                  fontWeight: FontWeight.w800,
                  color: theme.textTheme.headlineSmall?.color,
                )),
                Text('Ask questions about X-ray analyses', style: GoogleFonts.dmSans(
                  fontSize: 13, 
                  color: txtSec
                )),
              ],
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              controller: _scrollCtrl,
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Chat card
                  Container(
                    decoration: BoxDecoration(
                      color: theme.cardTheme.color,
                      borderRadius: BorderRadius.circular(16),
                      border: theme.cardTheme.shape is RoundedRectangleBorder 
                          ? Border.fromBorderSide((theme.cardTheme.shape as RoundedRectangleBorder).side)
                          : Border.all(color: isDark ? AppTheme.darkBorderColor : AppTheme.borderColor),
                    ),
                    child: Column(
                      children: [
                        // Card header
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                width: 32, height: 32,
                                decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(8)),
                                child: const Icon(Icons.smart_toy_outlined, size: 16, color: Colors.white),
                              ),
                              const SizedBox(width: 10),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('AI Chatbot', style: GoogleFonts.dmSans(
                                    fontSize: 16, 
                                    fontWeight: FontWeight.w700,
                                    color: theme.textTheme.titleMedium?.color
                                  )),
                                  Text('Medical AI assistant', style: GoogleFonts.dmSans(
                                    fontSize: 12, 
                                    color: txtSec
                                  )),
                                ],
                              ),
                              const Spacer(),
                              Container(
                                width: 8, height: 8,
                                decoration: const BoxDecoration(color: AppTheme.success, shape: BoxShape.circle),
                              ),
                            ],
                          ),
                        ),
                        const Divider(height: 1),
                        // Messages
                        ConstrainedBox(
                          constraints: const BoxConstraints(minHeight: 200, maxHeight: 350),
                          child: ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            padding: const EdgeInsets.all(16),
                            itemCount: _messages.length + (_isTyping ? 1 : 0),
                            itemBuilder: (_, i) {
                              if (i == _messages.length) return const _TypingIndicator();
                              final m = _messages[i];
                              return ChatBubble(
                                message: m['text'],
                                isUser: m['isUser'],
                                time: m['time'],
                              );
                            },
                          ),
                        ),
                        const Divider(height: 1),
                        // Input
                        Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _messageCtrl,
                                  style: GoogleFonts.dmSans(fontSize: 14),
                                  onSubmitted: (_) => _sendMessage(),
                                  decoration: const InputDecoration(
                                    hintText: 'Ask a question about X-ray analysis...',
                                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                width: 42, height: 42,
                                decoration: BoxDecoration(
                                  color: AppTheme.primary,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: IconButton(
                                  icon: const Icon(Icons.send, color: Colors.white, size: 18),
                                  onPressed: _sendMessage,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Quick Questions
                  SectionCard(
                    title: 'Quick Questions',
                    description: 'Common queries',
                    child: Column(
                      children: _quickQuestions.map((q) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            onPressed: () => _sendMessage(q),
                            style: OutlinedButton.styleFrom(
                              alignment: Alignment.centerLeft,
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            ),
                            child: Text(q, style: GoogleFonts.dmSans(fontSize: 13)),
                          ),
                        ),
                      )).toList(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // AI Capabilities
                  SectionCard(
                    title: 'AI Capabilities',
                    child: Column(
                      children: [
                        _CapabilityRow('Explain AI diagnosis results', theme: theme),
                        _CapabilityRow('Compare patient scans', theme: theme),
                        _CapabilityRow('Suggest treatment protocols', theme: theme),
                        _CapabilityRow('Clarify medical terminology', theme: theme),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CapabilityRow extends StatelessWidget {
  final String text;
  final ThemeData theme;
  const _CapabilityRow(this.text, {required this.theme});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(width: 6, height: 6, decoration: const BoxDecoration(color: AppTheme.primary, shape: BoxShape.circle)),
          const SizedBox(width: 10),
          Text(text, style: GoogleFonts.dmSans(
            fontSize: 14, 
            color: theme.textTheme.bodyLarge?.color
          )),
        ],
      ),
    );
  }
}

class _TypingIndicator extends StatelessWidget {
  const _TypingIndicator();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 32, height: 32,
            decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(16)),
            child: const Icon(Icons.smart_toy_outlined, size: 16, color: Colors.white),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.darkRowBg : const Color(0xFFF3F3F5),
              borderRadius: BorderRadius.circular(16).copyWith(bottomLeft: const Radius.circular(4)),
            ),
            child: Row(
              children: List.generate(3, (i) => Container(
                width: 6, height: 6,
                margin: EdgeInsets.only(right: i < 2 ? 4 : 0),
                decoration: BoxDecoration(
                  color: isDark ? AppTheme.darkTextSecondary : AppTheme.textSecondary,
                  shape: BoxShape.circle,
                ),
              )),
            ),
          ),
        ],
      ),
    );
  }
}