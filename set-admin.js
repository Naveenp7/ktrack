// This is a utility script to set a user as an admin
// You can run this in the browser console after logging in with the user you want to make an admin

function setUserAsAdmin(userId) {
    // Check if Firebase is initialized
    if (!firebase || !firebase.database) {
        console.error('Firebase is not initialized. Make sure you run this on the Traffic Monitor page after logging in.');
        return;
    }
    
    // Reference to the user in the database
    const userRef = firebase.database().ref('users/' + userId);
    
    // Update the user's admin status
    userRef.update({
        isAdmin: true
    })
    .then(() => {
        console.log(`User ${userId} has been set as an admin successfully.`);
        console.log('Please refresh the page to see the admin panel link.');
    })
    .catch((error) => {
        console.error('Error setting user as admin:', error);
    });
}

// Instructions for use
console.log('To set the current user as an admin, run the following command in the console:');
console.log('setUserAsAdmin(firebase.auth().currentUser.uid);');
console.log('Make sure you are logged in before running this command.');

// Example usage:
// setUserAsAdmin(firebase.auth().currentUser.uid);