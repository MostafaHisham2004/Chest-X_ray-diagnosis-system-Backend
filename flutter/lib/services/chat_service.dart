import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/chat_models.dart';
import 'api_client.dart';

class ChatService {
  final ApiClient _api;
  final http.Client _streamClient;

  ChatService({ApiClient? api, http.Client? streamClient})
      : _api = api ?? ApiClient(),
        _streamClient = streamClient ?? http.Client();

  Future<List<ChatContact>> fetchContacts(String token) async {
    final body = await _api.get('/api/chat/contacts', token: token);
    final data = body['data'] as Map<String, dynamic>? ?? {};
    final contacts = data['contacts'] as List? ?? const [];
    return contacts
        .whereType<Map<String, dynamic>>()
        .map(ChatContact.fromJson)
        .toList();
  }

  Future<List<ChatThread>> fetchThreads(String token) async {
    final body = await _api.get('/api/chat/threads', token: token);
    final data = body['data'] as Map<String, dynamic>? ?? {};
    final threads = data['threads'] as List? ?? const [];
    return threads
        .whereType<Map<String, dynamic>>()
        .map(ChatThread.fromJson)
        .toList();
  }

  Future<void> sendConnectionRequest({
    required String token,
    required String phone,
  }) async {
    await _api.post(
      '/api/chat/initiate-handshake',
      token: token,
      body: {'phone': phone},
    );
  }

  Future<void> verifyConnection({
    required String token,
    required String code,
  }) async {
    await _api.post(
      '/api/chat/connections/verify',
      token: token,
      body: {'code': code},
    );
  }

  Future<Map<String, dynamic>> sendOtp({
    required String token,
    required String phone,
  }) async {
    final body = await _api.post(
      '/api/otp/send',
      token: token,
      body: {'phone': phone},
    );
    return body;
  }

  Future<void> verifyOtp({
    required String phone,
    required String code,
  }) async {
    await _api.post(
      '/api/otp/verify',
      body: {'phone': phone, 'code': code},
    );
  }

  Future<ChatThread> createThread({
    required String token,
    required int userId,
  }) async {
    final body = await _api.post(
      '/api/chat/threads',
      token: token,
      body: {'user_id': userId},
    );
    final data = body['data'] as Map<String, dynamic>? ?? {};
    return ChatThread.fromJson(data['thread'] as Map<String, dynamic>? ?? {});
  }

  Future<List<ChatMessage>> fetchMessages({
    required String token,
    required int threadId,
  }) async {
    final body = await _api.get(
      '/api/chat/threads/$threadId/messages',
      token: token,
    );
    final data = body['data'] as Map<String, dynamic>? ?? {};
    final messages = data['messages'] as List? ?? const [];
    return messages
        .whereType<Map<String, dynamic>>()
        .map(ChatMessage.fromJson)
        .toList();
  }

  Future<ChatMessage> sendMessage({
    required String token,
    required int threadId,
    required String body,
  }) async {
    final response = await _api.post(
      '/api/chat/threads/$threadId/messages',
      token: token,
      body: {'body': body},
    );
    final data = response['data'] as Map<String, dynamic>? ?? {};
    return ChatMessage.fromJson(data['message'] as Map<String, dynamic>? ?? {});
  }

  Stream<ChatMessage> streamMessages({
    required String token,
    required int threadId,
  }) async* {
    final request = http.Request(
      'GET',
      Uri.parse('${ApiConfig.baseUrl}/api/chat/threads/$threadId/stream'),
    );
    request.headers['Accept'] = 'text/event-stream';
    request.headers['Authorization'] = 'Bearer $token';

    final response = await _streamClient.send(request);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        'Unable to connect to chat updates.',
        statusCode: response.statusCode,
      );
    }

    String? event;
    final data = StringBuffer();
    await for (final line in response.stream
        .transform(utf8.decoder)
        .transform(const LineSplitter())) {
      if (line.isEmpty) {
        if (event == 'message' && data.isNotEmpty) {
          final decoded = jsonDecode(data.toString());
          if (decoded is Map<String, dynamic>) {
            yield ChatMessage.fromJson(decoded);
          }
        }
        event = null;
        data.clear();
        continue;
      }

      if (line.startsWith('event:')) {
        event = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        data.write(line.substring(5).trim());
      }
    }
  }
}
