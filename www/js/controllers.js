angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope, $ionicModal, $timeout, $rootScope, $localForage, $ionicLoading, $cordovaToast, $q, $location, userService, $ionicPopup) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  $scope.closeApp=function() {
    ionic.Platform.exitApp();
    console.log("app closed");
  };

  // Form data for the login modal
  $scope.loginData = {};

  // Create the login modal that we will use later
  $ionicModal.fromTemplateUrl('templates/login.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.modal = modal;
  });

  // Triggered in the login modal to close it
  $scope.closeLogin = function() {
    $scope.modal.hide();
  };

  // Open the login modal
  $scope.login = function() {
    $scope.modal.show();
  };

  // Perform the login action when the user submits the login form
  $scope.doLogin = function() {
    console.log('Doing login', $scope.loginData);

    // Simulate a login delay. Remove this and replace with your login
    // code if using a login system
    $timeout(function() {
      $scope.closeLogin();
    }, 1000);
  };

  var loggedInUser;
  $localForage.getItem('loggedInUser').then(function (data) {
    if(data){
      loggedInUser = data;
    } else {
      loggedInUser = {};
    }
  });
  var login ={};

  $scope.googleLogin = function () {
    // Log the user in via Google
    if(!ionic.Platform.isAndroid()){
      var provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(provider).then(function (data) {
        $rootScope.userStatus=true;
        $scope.closeLogin();
      },function(error) {
        console.log("Error authenticating user:", error);
      });
    } else {
      console.log("Currently only webview is supported, check back later");
    }
  };

  $scope.fbLogin = function () {
    $ionicLoading.show({
      template: 'Logging in...'
    });
    facebookConnectPlugin.getLoginStatus(function (success) {
      if (success.status === 'connected') {
        console.log("status: connected");

// The user is logged in and has authenticated your app, and response.authResponse supplies
// the user's ID, a valid access token, a signed request, and the time the access token
// and signed request each expire

// Check if we have our user saved
        $localForage.getItem('loggedInUser').then(function (data) {
          if(data){
            login.user=data;
            loggedInUser.info = {
              'email': login.user.email,
              'userId': login.user.userId,
              'name': login.user.name,
              'picture': "http://graph.facebook.com/" + login.user.userId + "/picture?type=large",
              // 'device_token': $rootScope.device_token
            };
            $ionicLoading.hide();
            $scope.closeLogin();
            $location.path("/app/chat");
          } else {
            login.user={};
            getFacebookProfileInfo(success.authResponse)
              .then(function (profileInfo) {
                console.log(profileInfo);
// For the purpose of this example I will store user data on local storage
                $localForage.setItem('loggedInUser',{
                  authResponse: success.authResponse,
                  userID: profileInfo.id,
                  name: profileInfo.name,
                  email: profileInfo.email,
                  // device_token: $rootScope.device_token,
                  picture: "http://graph.facebook.com/" + authResponse.userID + "/picture?type=large"
                });
                userService={
                  uid : profileInfo.id,
                  displayName : profileInfo.name
                };
                $ionicLoading.hide();
              }, function (fail) {
                $cordovaToast("Error in Network //fail");
// Fail get profile info
              });
          }
        });
      }
      else {
// If (success.status === 'not_authorized') the user is logged in to Facebook,
// but has not authenticated your app
// Else the person is not logged into Facebook,
// so we're not sure if they are logged into this app or not.
// Ask the permissions you need. You can learn more about
// FB permissions here: https://developers.facebook.com/docs/facebook-login/permissions/v2.4
        console.log("status: unauthorized or not logged in");
        facebookConnectPlugin.login(['email', 'public_profile'], fbLoginSuccess, fbLoginError);
      }
    });
  };

// This is the success callback from the login method
  var fbLoginSuccess = function (response) {
    if (!response.authResponse) {
      fbLoginError("Cannot find the authResponse");
      return;
    }
    var authResponse = response.authResponse;

    console.log("before Login");
    getFacebookProfileInfo(authResponse)
      .then(function (profileInfo) {
        console.log('after login');
        console.dir(profileInfo);
        loggedInUser.info = {
          'email': profileInfo.email,
          'userId': profileInfo.id,
          'name': profileInfo.name,
          'picture': "http://graph.facebook.com/" + profileInfo.id + "/picture?type=large",
          // 'device_token': $rootScope.device_token
        };
        userService={
          uid : profileInfo.id,
          displayName : profileInfo.name
        };
        $localForage.setItem('loggedInUser', loggedInUser.info).then(function (data) {
          console.log("pushed to local storage", data);
          $scope.closeLogin();
          $location.path("/app/chat");
        });

        // var newUser = dataService.getUserDetails(loggedInUser.info.userId);
        // if(newUser==null){
        //   console.log("fbSignup", loggedInUser.info);
        //   dataService.fbSignUp(loggedInUser.info.userId, loggedInUser.info);
        // }

        $ionicLoading.hide();

      }, function (err) {
        $ionicLoading.hide();
        console.log(err,"In storing user data on local storage");
      });
  };

// This is the fail callback from the login method
  var fbLoginError = function (error) {
    $ionicLoading.hide();
    console.log("in error", error);
  };

// This method is to get the user profile info from the facebook api
  var getFacebookProfileInfo = function (authResponse) {
    var info = $q.defer();
    facebookConnectPlugin.api('/me?fields=email,name&access_token=' + authResponse.accessToken, null,
      function (response) {
        info.resolve(response);
      },
      function (response) {
        info.reject(response);
      }
    );
    return info.promise;
  };

  $scope.emailSignIn = function () {
    signInPopup();
  };

  var signInPopup = function() {
    var scope = $scope.$new();
    scope.data = {};
    var myPopup = $ionicPopup.show({
      templateUrl: 'templates/emailLogin.html',
      title: 'Login using your Email',
      subTitle: 'Login',
      scope: scope,
      buttons: [{
        text: 'Cancel',
        onTap: function (e) {
          scope.data.canceled = true;
          return scope.data;
        }
      }, {
        text: '<b>Log In</b>',
        type: 'button-positive',
        onTap: function (e) {
          var email = scope.data.email;
          if (email && email.length > 3) {
            return scope.data;
          } else {
            alert('Enter correct email');
            e.preventDefault();
          }
          var pass = scope.data.password;
          if (pass && pass.length > 5) {
            return scope.data;
          } else {
            alert('Min length of password is 6');
            e.preventDefault();
          }
        }
      }]
    });

    myPopup.then(function (result) {
      if (result.canceled) {
        return;
      }
      $ionicLoading.show({
        template: 'Logging In...'
      });
      var signInDetails = {
        email: result.email,
        password: result.password
      };

      firebase.auth().signInWithEmailAndPassword(signInDetails.email, signInDetails.password).then(function(response){
        var user = firebase.auth().currentUser;

        if (user != null) {
          $scope.closeLogin();
          $location.path("/app/chat");
          if( ionic.Platform.isAndroid() || ionic.Platform.isIOS()) {
            loggedInUser.info = {
              'email': user.email,
              'userId': user.uid,
              'name': user.displayName,
              'picture': user.photoURL,
              // 'device_token': $rootScope.device_token

              // The user's ID, unique to the Firebase project. Do NOT use
              // this value to authenticate with your backend server, if
              // you have one. Use User.getToken() instead.
            };
          }
          else {
            loggedInUser.info = {
              'email': user.email,
              'userId': user.uid,
              'name': user.displayName,
              'picture': user.photoURL
            };
          }

        }
        // var newUser = dataService.getUserDetails(loggedInUser.info.userId);
        // if (newUser == null) {
        //   dataService.emailSignUp(loggedInUser.info.userId, loggedInUser.info);
        // }

        $localForage.setItem('loggedInUser', loggedInUser.info);

        console.log(loggedInUser.info);
        $ionicLoading.hide();
      },function (error) {
        $ionicLoading.hide();
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log(errorCode, errorMessage);
      });
    });
  };

//This method is executed when the user press the "forgot password" link
  $scope.resetPassword =function () {
    console.log("clicked");
    $scope.showPopup();
  };
  $scope.showPopup = function() {
    $scope.data = {};

    // An elaborate, custom popup
    var myPopup = $ionicPopup.show({
      template: '<input type="email" ng-model="data.email">',
      title: 'Reset Password',
      subTitle: 'Enter your email id',
      scope: $scope,
      buttons: [
        { text: 'Cancel' },
        {
          text: '<b>Send</b>',
          type: 'button-positive',
          onTap: function(e) {
            if (!$scope.data.email) {
              //don't allow the user to close unless he enters wifi password
              e.preventDefault();
            } else {
              $ionicLoading.show({
                template: 'Sending a password reset link...'
              });
              return $scope.data.email;
            }
          }
        }
      ]
    });

    myPopup.then(function(res) {
      var auth = firebase.auth();
      // var emailAddress = res;

      auth.sendPasswordResetEmail(res).then(function() {
        $ionicLoading.hide();
        console.log("email sent");
      }, function(error) {
        $ionicLoading.hide();
        console.log("error",error);
        // An error happened.
      });
    });
  };

  // A confirm dialog
  // $scope.showConfirm = function() {
  // 	var confirmPopup = $ionicPopup.confirm({
  // 		title: 'Create a new Password',
  // 		template: 'Are you sure you want to eat this ice cream?'
  // 	});
  //
  // 	confirmPopup.then(function(res) {
  // 		if(res) {
  // 			console.log('You are sure');
  // 		} else {
  // 			console.log('You are not sure');
  // 		}
  // 	});
  // };
  //
  // An alert dialog
  // $scope.showAlert = function() {
  // 	var alertPopup = $ionicPopup.alert({
  // 		title: 'Don\'t eat that!',
  // 		template: 'It might taste good'
  // 	});
  //
  // 	alertPopup.then(function(res) {
  // 		console.log('Thank you for not eating my delicious ice cream cone');
  // 	});
  // };

//This method is executed when the user press the "Dont have an account" link
  $scope.createAccount = function () {
    createPopup();
  };

  var createPopup = function() {
    var scope = $scope.$new();
    scope.data = {};
    var myPopup = $ionicPopup.show({
      templateUrl: 'templates/createAccount.html',
      title: 'Create a new account',
      subTitle: 'Signup',
      scope: scope,
      buttons: [{
        text: 'Cancel',
        onTap: function(e) {
          scope.data.canceled = true;
          return scope.data;
        }
      }, {
        text: '<b>Sign Up</b>',
        type: 'button-positive',
        onTap: function(e) {
          var email = scope.data.email;
          var password = scope.data.password;
          var name = scope.data.name;
          if (email && email.length > 3) {
          } else {
            alert('Enter correct email');
            e.preventDefault();
          }
          $ionicLoading.show({
            template: 'Creating your account...'
          });
          var createUserId = function () {
            var info = $q.defer();
            firebase.auth().createUserWithEmailAndPassword(email, password).then(function (response) {
                info.resolve(response);
              },
              function (error) {
                info.reject(error);
              }
            );
            return info.promise;
          };
          createUserId().then(function () {
            var user = firebase.auth().currentUser;

            user.updateProfile({
              displayName: scope.data.name,
              photoURL: "https://dl.dropbox.com/s/4tdz2fuzfcr29t6/avatar.png?dl=1"
            }).then(function() {
              console.log("Update Successful");
              // Update successful.
              if (user != null) {
                loggedInUser.info = {
                  'email': user.email,
                  'userId': user.uid,
                  'name': user.displayName,
                  'picture': user.photoURL,
                  // 'device_token': $rootScope.device_token

                  // The user's ID, unique to the Firebase project. Do NOT use
                  // this value to authenticate with your backend server, if
                  // you have one. Use User.getToken() instead.
                };
                // var newUser = dataService.getUserDetails(loggedInUser.info.userId);
                // if(newUser==null){
                //   dataService.emailSignUp(loggedInUser.info.userId, loggedInUser.info);
                // }
                $localForage.setItem('loggedInUser', loggedInUser.info);

                console.log(loggedInUser.info);
                myPopup.close();
                return scope.data;
              } else {
                console.log("user is null");
              }
            }, function(error) {
              console.log("Account Created but update was unsuccessful", error);
              // An error happened.
            });
          }, function (error) {
            // Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            console.log("ErrorCode: ",errorCode);
            console.log("ErrorMessage: ", errorMessage);
            // ...
            $ionicLoading.hide();
            alert(errorMessage);
          });
          e.preventDefault();
        }
      }]
    });
    myPopup.then(function() {
      $ionicLoading.hide();
      $scope.closeLogin();
      $location.path("/app/chat");
    });
  };
})

.controller('chatCtrl', function() {

    firebase.auth().onAuthStateChanged(function(user) {
      // Once authenticated, instantiate Firechat with the logged in user
      if (user) {
        initChat(user);
      }
    });

    function initChat(user) {
      // Get a Firebase Database ref
      var chatRef = firebase.database().ref("chat");

      // Create a Firechat instance
      var chat = new FirechatUI(chatRef, document.getElementById("firechat-wrapper"));

      // Set the Firechat user
      chat.setUser(user.uid, user.displayName);
    }
  });
