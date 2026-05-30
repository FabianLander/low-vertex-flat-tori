import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;

/**Documentation file*/


public class DocInstructions {

    public DocInstructions() {}

    public static void setup(DocumentCanvas D) {
    
	String S="Pup Tent Universality\n";
	S=S+"paper by Peter Doyle and Rich Schwartz\n";
	S=S+"program by Rich\n";
	S=S+"program started: August 2025\n";
	S=S+"Last updated:  7 Oct 2025\n";


	S=S+"\n\nPURPOSE:\n\n";
	S=S+"This program studies properties of the pup tent,  an 8-vertex paper torus I recently discovered.  Peter and I call these kind of tori pup tents.  This program is a companion to our paper `8 Vertex Paper Tori: Universality and Collapsibility'.  It does not play a formal role in the proofs in the paper but it does help visualize the things in the paper.";

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

	    S=S+"\n\n6. Golden: This is a crucial window. This lets you select a golden pup tent, and also trace out the good path back into the embedding locus.  This window essentially implements the important formulas in the paper.";

	    S=S+"\n\n7. Newton: This is related to experiments I did trying to move a general pup tent towards the locus of golden pup tents.";
	    
	    S=S+"\n\n8. Bundle: This shows the window which lets you control the coefficients (X1,X2) for the paper. This shows much more structure than what is in the paper. The magic point is the choice of X1,X2 from the paper. It is the barycenter of a certain triangle.";
	    
	    S=S+"\n\n CONTROL PANEL FEATURES";

	    S=S+"\n\ndisplay:  You can use the window on the left to recolor and display various objects.  The buttons in the left column control the color, which you get from the color selector. The buttons on the right (usually) control whether this object is displayed or not.  You just have to play around with these buttons to see what they do.";

	    S=S+"\n\ntests: The next control panel lets you select various tests you can make. For instance, you can print out the vertices of the pup tent you are considering, and you can compute the minimum angles of the faces.  To run a test, press the `test' button and the information will printout in the command line. (I always run the program from a unix terminal; I don't know what happens if you run it some other way.  The test is applied to the currently stored pup tent.)";
	    

	    S=S+"\n\n Torus Choice:  This lets you select the pup tent under study.  The first option is the pup tent listed in the paper in the discussion section at the end of Chapter 2. This is a known embedded pup tent and it is the one to which all the others are compared to in Chapter 3.   The second option is the pup tent from my first paper. It is very similar to the first one.   The third one is the main option.  This selects the golden pup tents and their deformations along the good path.  The fourth one is tied to some experiments with moving a pup tent towards the golden locus using coerced random walks. So, this option takes its input from the newton window.  Once you select a pup tent you can view it in the extrinsic slider and the intrinsic window.";

	    
	    S=S+"\n\n slicer display: This controls which of two things is shown in the torus slicer window.  The main thing the slicer window does is show you various slices of the pup tent. However, if you choose the `stars' option you can see the projectivized stars of each vertex of the pup tent.  The star of a vertex is the union of all rays starting at the vertex and initially staying inside the triangles incident to the vertex.  You can look at this projectively, and this gives you the images in the slicer window.";

	    S=S+"\n\n level curves: You can control the number of level curves shown in the slice foliation in the intrinsic geometry window using these keys.";
	    
	    S=S+"\n\n shape: You can toggle between several different pup tents.  The first one is the one from the paper.";

	    S=S+"\n\n action You can toggle between several different multi-threaded operations. In `slicer' mode this makes an animation of the torus slices. In 'newton' mode, this lets you experiment with how Newton's method converges candidate seeds to pup tents.  In 'coeffs' mode this does experiments with the bundle window, in connection with the selection of the magic point X1,X2. This last option was vital for the research phase of the paper but you don't need to know how this works.";

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

    S=S+"\n\nGOLDEN VALLEY WINDOW";

    S=S+"\n\nThis is the most important window.  The blue domain is a copy of the classic modular domain in the hyperbolic plans. You select a golden pup tent by moving around in this window. You should open up the intrinsic window and set the pup tent to golden to see the nice pictures.  The big red vertical slider lets you select a parameter along the good path out of the golden locus.    The controls at the top modify the construction in various ways.  The most important modifier here is the path switch.  When on the left, you are just getting the golden pup tents.  When on the right you are getting points along the good path, as controlled by the red slider.   The red row of squares at the top controls the gridding of the golden locus.  Just play around with it and see what it does.";
    
    S=S+"\n\nNEWTON WINDOW";

    S=S+"\n\nThis window lets you look at some projections of the pup tents.   Its main purpose, which you do not need to worry about, is to experiment with moving an embedded pup tent towards the golden locus through coerced random walks.  This window interacts with the newton option for the multithreaded action.  If you are curious you can open this window and select the newton option and press the big green button.  Also select the newton option on the torus choice.  Perhaps this will work for you.";

    S=S+"\n\nBUNDLE WINDOW";

    S=S+"\n\nThis window let me do experiments with the choice of coefficients in the (X1,X2) plane.  The magic point is the point (X1,X2) from the paper.  This window shows a lot of the structure surrounding the miraculous choice made in the paper.  Earlier versions of the paper elucidated a lot of this structure but in the end we went for a shorter proof. If you want to see a nice demo open up this and the golden window and select the coeffs option on the action control panel. Then press the green button.  You don't need to know what this is doing to appreciate the rest of the program, so I won't explain it.";
    

     DocumentCanvas.setText(D,S);
    }    

}

