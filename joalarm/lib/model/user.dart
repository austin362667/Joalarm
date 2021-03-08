import 'dart:convert';

import 'package:http/http.dart';

class User {
  final String id;
  final String name;

  User({this.id, this.name});

  factory User.fromJson(Map<String, dynamic> json) {
    return User(id: json['id'].toString(), name: json['name'].toString());
  }
}

class UserViewModel {
  static List<User> users;

  static Future loadUsers() async {
    try {
      List<User> _users;
      Response res = await get('http://66.228.52.222:3000/allUser');
      String jsonString = res.body.toString();
      Map parsedJson = json.decode(jsonString);
      // var categoryJson = parsedJson['users'] as List;
      for (int i = 0; i < parsedJson.length; i++) {
        _users.add(new User.fromJson(parsedJson[i]));
      }
      users = _users;
    } catch (e) {
      print(e);
    }
  }
}
