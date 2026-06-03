import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/shared_widgets.dart';

class PatientChatbotScreen extends StatefulWidget {
  const PatientChatbotScreen({super.key});

  @override
  State<PatientChatbotScreen> createState() => _PatientChatbotScreenState();
}

class _PatientChatbotScreenState extends State<PatientChatbotScreen> {
  final _scrollCtrl = ScrollController();
  final _messageCtrl = TextEditingController();
  bool _isTyping = false;

  final List<Map<String, dynamic>> _messages = [
    {
      'text': "Hello John! 👋 I'm your friendly AI health assistant. I'm here to help you understand your health reports, explain medical terms in simple language, and answer your health questions. How can I help you today?",
      'isUser': false,
      'time': '02:55 PM',
    },
  ];

  final _quickQuestions = [
    'What does pneumonia mean?',
    'How serious is my condition?',
    'What can I do to recover?',
    'When should I see a doctor?',
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
        _messages.add({'text': _getResponse(text), 'isUser': false, 'time': _timeNow()});
      });
      _scrollToBottom();
    });
  }

  String _getResponse(String q) {
    final lower = q.toLowerCase();
    if (lower.contains('pneumonia')) {
      return "Pneumonia is an infection that inflames the air sacs in one or both lungs. The air sacs may fill with fluid or pus, causing symptoms like cough, fever, chills, and difficulty breathing. In your case, the AI detected a mild form — this is very treatable with proper medication! 😊";
    } else if (lower.contains('serious') || lower.contains('condition')) {
      return "Based on the AI analysis showing 93% confidence for mild pneumonia, your condition is manageable! Mild pneumonia typically responds well to treatment. However, please follow your doctor's advice and complete any prescribed antibiotics. If you develop worsening symptoms, see a doctor immediately.";
    } else if (lower.contains('recover') || lower.contains('treatment')) {
      return "Here are key steps to recover:\n\n• Rest as much as possible\n• Stay well hydrated (water, clear broths)\n• Take all prescribed medications\n• Avoid smoking and alcohol\n• Monitor your temperature\n• Attend all follow-up appointments\n\nMost mild pneumonia cases improve within 1-3 weeks. 💪";
    } else if (lower.contains('doctor') || lower.contains('see a')) {
      return "Please see a doctor immediately if you experience:\n\n🚨 Difficulty breathing or shortness of breath\n🌡️ High fever above 39°C (102°F)\n💙 Bluish lips or fingertips\n😴 Extreme fatigue or confusion\n\nFor routine follow-up, schedule an appointment as advised by your doctor within 2 weeks.";
    }
    return "That's a great question! Based on your health records, I can see you're doing regular check-ups which is excellent. For specific medical advice, always consult your doctor. Is there anything specific about your recent X-ray results or health recommendations you'd like me to explain?";
  }

  String _timeNow() {
    final now = DateTime.now();
    final h = now.hour > 12 ? now.hour - 12 : now.hour == 0 ? 12 : now.hour;
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? AppTheme.darkBackground : AppTheme.background,
      appBar: const SessionAppTopBar(),
      body: Column(
        children: [
          Container(
            color: isDark ? AppTheme.darkCardBg : Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('AI Health Assistant', style: GoogleFonts.dmSans(fontSize: 22, fontWeight: FontWeight.w800)),
                Text('Ask about your health', style: GoogleFonts.dmSans(fontSize: 13, color: isDark ? AppTheme.darkTextSecondary : AppTheme.textSecondary)),
              ],
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              controller: _scrollCtrl,
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Chat area
                  Container(
                    decoration: BoxDecoration(
                      color: isDark ? AppTheme.darkCardBg : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: isDark ? AppTheme.darkBorderColor : AppTheme.borderColor),
                    ),
                    child: Column(
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                width: 32, height: 32,
                                decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(8)),
                                child: const Icon(Icons.favorite_outline, size: 16, color: Colors.white),
                              ),
                              const SizedBox(width: 10),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Your Health Assistant', style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w700)),
                                  Text('Easy-to-understand health info', style: GoogleFonts.dmSans(fontSize: 12, color: isDark ? AppTheme.darkTextSecondary : AppTheme.textSecondary)),
                                ],
                              ),
                              const Spacer(),
                              Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppTheme.success, shape: BoxShape.circle)),
                            ],
                          ),
                        ),
                        const Divider(height: 1),
                        ConstrainedBox(
                          constraints: const BoxConstraints(minHeight: 200, maxHeight: 320),
                          child: ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            padding: const EdgeInsets.all(16),
                            itemCount: _messages.length + (_isTyping ? 1 : 0),
                            itemBuilder: (_, i) {
                              if (i == _messages.length) return const _TypingBubble();
                              final m = _messages[i];
                              return ChatBubble(message: m['text'], isUser: m['isUser'], time: m['time']);
                            },
                          ),
                        ),
                        const Divider(height: 1),
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
                                    hintText: 'Ask me anything about your health...',
                                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                width: 42, height: 42,
                                decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(10)),
                                child: IconButton(
                                  // FIX: removed const, isDark is a runtime value
                                  icon: Icon(Icons.send, color: isDark ? AppTheme.darkCardBg : Colors.white, size: 18),
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
                  SectionCard(
                    title: 'Common Questions',
                    description: 'Quick answers',
                    child: Column(
                      children: _quickQuestions.map((q) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            onPressed: () => _sendMessage(q),
                            style: OutlinedButton.styleFrom(alignment: Alignment.centerLeft, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14)),
                            child: Text(q, style: GoogleFonts.dmSans(fontSize: 13)),
                          ),
                        ),
                      )).toList(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SectionCard(
                    title: 'Health Tips',
                    child: Column(
                      children: const [
                        _TipRow(Icons.medication_outlined, 'Take medications as prescribed'),
                        _TipRow(Icons.bedtime_outlined, 'Get 7-9 hours of sleep'),
                        _TipRow(Icons.water_drop_outlined, 'Stay hydrated with water'),
                        _TipRow(Icons.smoke_free_outlined, 'Avoid smoking and alcohol'),
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

class _TipRow extends StatelessWidget {
  final IconData icon;
  final String text;
  const _TipRow(this.icon, this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(width: 6, height: 6, decoration: const BoxDecoration(color: AppTheme.primary, shape: BoxShape.circle)),
          const SizedBox(width: 10),
          Icon(icon, size: 16, color: AppTheme.primary),
          const SizedBox(width: 8),
          Text(text, style: GoogleFonts.dmSans(fontSize: 14)),
        ],
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

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
            child: const Icon(Icons.favorite_outline, size: 16, color: Colors.white),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFF3F3F5),
              borderRadius: BorderRadius.circular(16).copyWith(bottomLeft: const Radius.circular(4)),
            ),
            // FIX: removed const from Row, isDark is a runtime value
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