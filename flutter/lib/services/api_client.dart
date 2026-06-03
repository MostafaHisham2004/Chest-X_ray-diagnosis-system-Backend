import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  const ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

class ApiClient {
  final http.Client _client;

  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  Uri _uri(String path) => Uri.parse('${ApiConfig.baseUrl}$path');

  Future<Map<String, dynamic>> get(
    String path, {
    String? token,
  }) async {
    final response = await _client.get(
      _uri(path),
      headers: _headers(token),
    );
    return _parse(response);
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    final response = await _client.post(
      _uri(path),
      headers: _headers(token),
      body: body == null ? null : jsonEncode(body),
    );
    return _parse(response);
  }

  Future<Map<String, dynamic>> patch(
    String path, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    final response = await _client.patch(
      _uri(path),
      headers: _headers(token),
      body: body == null ? null : jsonEncode(body),
    );
    return _parse(response);
  }

  Future<Map<String, dynamic>> delete(
    String path, {
    String? token,
    Map<String, dynamic>? body,
  }) async {
    final response = await _client.delete(
      _uri(path),
      headers: _headers(token),
      body: body == null ? null : jsonEncode(body),
    );
    return _parse(response);
  }

  Map<String, String> _headers(String? token) {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Map<String, dynamic> _parse(http.Response response) {
    Map<String, dynamic> body = {};
    if (response.body.isNotEmpty) {
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          body = decoded;
        }
      } on FormatException {
        throw ApiException(
          'Server returned an invalid response.',
          statusCode: response.statusCode,
        );
      }
    }

    final success = body['success'] == true;
    if (response.statusCode >= 200 && response.statusCode < 300 && success) {
      return body;
    }

    final error = body['error'];
    final message = body['message'] as String? ??
        (error is Map<String, dynamic> ? error['message'] as String? : null) ??
        'Request failed';
    throw ApiException(message, statusCode: response.statusCode);
  }
}
