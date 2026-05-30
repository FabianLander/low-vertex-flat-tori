import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;

/**Documentation file*/


public class DocInstructions {

    public DocInstructions() {}

    public static void setup(DocumentCanvas D) {
    
	String S="Visualizing the Pup Tent\n";
	S=S+"program by Rich Schwartz\n";
	S=S+"program started: August 2025\n";
	S=S+"Last updated:  31 Oct 2025\n";


	S=S+"\n\nPURPOSE:\n\n";
	S=S+"This program studies properties of the pup tent. It is a companion to the latest version of my paper `Vertex Minimal Paper Tori'.  It does not play a formal role in the proofs in the paper but it does help visualize the things in the paper.";

	    S=S+"\n\nOPERATING INSTRUCTIONS\n\n";

	    S=S+"Here is some information about this text window. This window gives explanations for the rest of the program.  Drag the mouse over the text to scroll up or down. There is more text than what is now visible.  You can resize this window and  also change the font size.";

	    S=S+"\n\nThis program is designed to work best with a 3 button mouse, but you can also use the keys z,x,c as proxies for the mouse.  On the picture windows, buttoms 1 and 3 zoom in and out of the picture and button 2 generally selects a new point.  To use the key commands, you usually have to first click in the window to get its focus.";

	    S=S+"\n\nOn the main control panel there are some other buttons, which say things like 'triangulation', and 'eye', etc.  When you press these, you call forth other windows. I will give an explanation of these windows below.";

	    S=S+"\n\nI have done a ton of work to this program and it has a lot of features. I will not document all of them, or even most of them.  Beyond the basics, you just have to play around with it and see what it does. Or you can send me email and ask about it.";
	       

	    S=S+"\n\nLIST OF WINDOWS";

	    S=S+"\n\nHere is a list of the windows.";
	    
	    S=S+"\n\n0. Control panel: The is the one window that is permanently open during the operation of the program. It has all the control features. I will discuss these features below.";
	    
	    S=S+"\n\n1. Instructions: This is the documentation you are reading.";
	
  	    S=S+"\n\n2. Triangulation Window: Shows the triangulated flat torus. This is mainly for reference.";
	    
	    S=S+"\n\n3. Eye: Picks the direction you use to slice the pup tent. The eye also effects the level set foliation drawn in the intrinsic metric.  This needs to be open, and you have to navigate away from the very center.  Just play around with this while the other windows are open.";
	    
	    S=S+"\n\n4. Extrinsic slicer: Shows the slices and the projective stars of the pup tent vertices. I give more info about this below.";

	    S=S+"\n\n5. Inrinsic: Shows the intrinsic geometry of the pup tent.";
	    
	    S=S+"\n\n CONTROL PANEL FEATURES";

	    S=S+"\n\ndisplay:  You can use the window on the left to recolor and display various objects.  The buttons in the left column control the color, which you get from the color selector. The buttons on the right (usually) control whether this object is displayed or not.  You just have to play around with these buttons to see what they do.";

	    S=S+"\n\ntests: The next control panel lets you select various tests you can make. For instance, you can print out the vertices of the pup tent you are considering, and you can compute the minimum angles of the faces.  To run a test, press the `test' button and the information will printout in the command line. (I always run the program from a unix terminal; I don't know what happens if you run it some other way.  The test is applied to the currently stored pup tent.)";
	    
	    
	    S=S+"\n\n slicer display: This controls which of two things is shown in the torus slicer window.  The main thing the slicer window does is show you various slices of the pup tent. However, if you choose the `stars' option you can see the projectivized stars of each vertex of the pup tent.  The star of a vertex is the union of all rays starting at the vertex and initially staying inside the triangles incident to the vertex.  You can look at this projectively, and this gives you the images in the slicer window.";

	    S=S+"\n\n level curves: You can control the number of level curves shown in the slice foliation in the intrinsic geometry window using these keys.";
	    
	    S=S+"\n\n Go Button: This makes an animation of the torus slices.";

	    S=S+"\n\nColor reset: This changes the colors of the triangles in the triangulation. Just try it out with the triangulation window open to see what happens.";
	    
	    S=S+"\n\ncolored square grid: This control panel lets you individually control the colors of the 16 faces of the pup tent.  You can also color these faces by clicking the middle mouse button (or key-c) on the triangles in the triangulation window.";

	    S=S+"\n\n There are some extra selection buttons and arrows when some of the features are turned on. You should just figure out with these do by playing with them when they come up.";
	    

    S=S+"\n\nEYE WINDOW";

    S=S+"\n\nThis window lets you select the slicing direction.   As you move the point around you are selecting a frame in space.  The first vector in the frame tells the direction you slice in, and the second one picks a way to rotate the image.  The first vector is very important and the second one is selected in some automatic way that I don't care about.  This window needs to be open for the extrinsic slicer to work properly. Also, when this window is open it enhances the pictures in the intrinsic window.";

    S=S+"\n\nEXTRINSIC SLICER";

S=S+"\n\nThe extrinsic slider window displays the projective stars of the torus and also the slices.\n\n";

S=S+"When you are in `star mode' use the arrow keys to change which of the stars you are looking at.  In all cases, what you see is the projectivization of the fan defined by the 6 triangles incident to the chosen vertex.  You can use this mode to convince yourself that pairs of triangles which have at least one vertex in common have disjoint interiors.";

S=S+"\n\nWhen you are in slices more use the eye window to choose which of the coordinate directions to slice in.  Use the qwerty keys (and precisely these keys) to change the slice.  You should just play around with this to see how it works.";


    S=S+"\n\nINTRINSIC WINDOW";

    S=S+"\n\nThis window shows the universal cover of the intrinsic structure associated to the flat torus.  It plays nicely with the eye window.  Once you use the eye window to pick a direction from the eye window, you get a foliation of the torus by level curves. You can see this foliation in the intrinsic structure in this window, and you can also highlight the chosen level set on the torus window.  By comparing the polygons you see in the intrinsic metric window and in the torus window you can get a feel for the complicated way the 8-vertex paper torus is embedded in space.";

     DocumentCanvas.setText(D,S);
    }    

}

