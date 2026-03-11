import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function EditProfile() {

  const router = useRouter();

  return (
    <ScrollView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} />
        </TouchableOpacity>

        <Text style={styles.title}>Edit Profile</Text>
        <Text style={styles.subtitle}>Update your personal details</Text>
      </View>

      {/* Profile Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{uri:"https://i.pravatar.cc/150"}}
          style={styles.avatar}
        />

        <TouchableOpacity style={styles.changeBtn}>
          <Ionicons name="camera" size={18}/>
          <Text style={styles.changeText}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Personal Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <TextInput style={styles.input} placeholder="Full Name"/>
        <TextInput style={styles.input} placeholder="Email"/>
        <TextInput style={styles.input} placeholder="Phone"/>
        <TextInput style={styles.input} placeholder="Age"/>
        <TextInput style={styles.input} placeholder="Gender"/>
      </View>

      {/* Health Details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Health Details</Text>

        <View style={styles.row}>
          <TextInput style={styles.smallInput} placeholder="Height"/>
          <TextInput style={styles.smallInput} placeholder="Weight"/>
        </View>

        {/* <View style={styles.row}>
          <TextInput style={styles.smallInput} placeholder="Activity Level"/>
          <TextInput style={styles.smallInput} placeholder="Goal"/>
        </View> */}
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn}>
        <Text style={styles.saveText}>Save Changes</Text>
      </TouchableOpacity>

      <TouchableOpacity>
        <Text style={styles.cancel}>Cancel</Text>
      </TouchableOpacity>

     

    </ScrollView>
  );
}

const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#F6F7FB",
padding:20
},

header:{
alignItems:"center",
marginBottom:20
},

title:{
fontSize:24,
fontWeight:"bold"
},

subtitle:{
color:"gray"
},

imageContainer:{
alignItems:"center",
marginBottom:20
},

avatar:{
width:110,
height:110,
borderRadius:60
},

changeBtn:{
flexDirection:"row",
marginTop:10,
backgroundColor:"#e8f0f0",
padding:8,
borderRadius:20
},

changeText:{
marginLeft:5
},

card:{
backgroundColor:"#fff",
padding:15,
borderRadius:12,
marginBottom:15,
shadowColor:"#000",
shadowOpacity:0.05,
shadowRadius:5
},

sectionTitle:{
fontWeight:"bold",
marginBottom:10,
fontSize:16
},

input:{
backgroundColor:"#f4f4f4",
padding:12,
borderRadius:10,
marginBottom:10
},

row:{
flexDirection:"row",
justifyContent:"space-between"
},

smallInput:{
backgroundColor:"#f4f4f4",
padding:12,
borderRadius:10,
width:"48%"
},

saveBtn:{
backgroundColor:"#2a8c82",
padding:15,
borderRadius:25,
alignItems:"center",
marginTop:10
},

saveText:{
color:"white",
fontWeight:"bold",
fontSize:16
},

cancel:{
textAlign:"center",
marginTop:10,
color:"gray"
},

delete:{
textAlign:"center",
color:"red",
marginTop:5
}

});