import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:joalarm/constants.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert' show json, base64, ascii;

import 'package:joalarm/main.dart';

final storage = FlutterSecureStorage();

class OnBoardingPage extends StatelessWidget {
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  void displayDialog(context, title, text) => showDialog(
        context: context,
        builder: (context) =>
            AlertDialog(title: Text(title), content: Text(text)),
      );

  Future<String> attemptLogIn(String username, String password) async {
    var res = await http.post("$SERVER_IP/login",
        body: {"username": username, "password": password});
    if (res.statusCode == 200) return res.body;
    return null;
  }

  Future<int> attemptSignUp(String username, String password) async {
    var res = await http.post('$SERVER_IP/signup',
        body: {"username": username, "password": password});
    return res.statusCode;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text("OnBoarding"),
        ),
        body: Center(
            child: Padding(
          padding: const EdgeInsets.all(10.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: <Widget>[
              TextField(
                controller: _usernameController,
                decoration: InputDecoration(labelText: 'Username'),
              ),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: InputDecoration(labelText: 'Password'),
              ),
              SizedBox(
                height: 20,
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  ElevatedButton(
                    onPressed: () async {
                      var username = _usernameController.text;
                      var password = _passwordController.text;
                      var jwt = await attemptLogIn(username, password);
                      if (jwt != null) {
                        storage.write(key: "jwt", value: jwt);
                        Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (context) =>
                                    HomePage.fromBase64(jwt)));
                      } else {
                        displayDialog(context, "An Error Occurred",
                            "No account was found matching that username and password");
                      }
                    },
                    child: Text("Log In"),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: Colors.black,
                    ),
                  ),
                  SizedBox(width: 20),
                  ElevatedButton(
                    onPressed: () async {
                      var username = _usernameController.text;
                      var password = _passwordController.text;

                      if (username.length < 4)
                        displayDialog(context, "Invalid Username",
                            "The username should be at least 4 characters long");
                      else if (password.length < 4)
                        displayDialog(context, "Invalid Password",
                            "The password should be at least 4 characters long");
                      else {
                        var res = await attemptSignUp(username, password);
                        if (res == 201)
                          displayDialog(context, "Success",
                              "The user was created. Log in now.");
                        else if (res == 409)
                          displayDialog(
                              context,
                              "That username is already registered",
                              "Please try to sign up using another username or log in if you already have an account.");
                        else {
                          displayDialog(
                              context, "Error", "An unknown error occurred.");
                        }
                      }
                    },
                    child: Text("Sign Up"),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: Colors.black,
                    ),
                  )
                ],
              )
            ],
          ),
        )));
  }
}
