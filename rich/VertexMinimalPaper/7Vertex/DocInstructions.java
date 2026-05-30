import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;

/**Documentation file*/


public class DocInstructions {

    public DocInstructions() {}

    public static void setup(DocumentCanvas D) {
    
	String S="Seven Vertex Torus Combinatorics\n";
	S=S+"by Rich Schwartz\n";
	S=S+"program started: 10 July 2025\n";
	S=S+"Last updated:  15 July 2025\n";

	    S=S+"\n\nBEFORE WE GET STARTED\n\n";

	    S=S+"This window gives explanations for the rest of the program.  Drag the mouse over the text to scroll up or down. There is more text than what is now visible.  You can resize this window and also change the font size. You can also resize this window.  In other words, you can arrange things so that it is convenient to read all the explanations below.";
	    
	    S=S+"The question box at the top of this window returns the text in this window to its original configuration.  Try pressing the question boxes to see what they do.";

	    S=S+"\n\nThis program is designed to work best with a 3 button mouse. On the picture windows, buttoms 1 and 3 zoom in and out of the picture and button 2 generally selects a new point. If you don't have a 3 button mouse, you can use the keyboard buttons z,x,c to simulate the 3 buttons when you are operating any of the windows where you might want to rescale the picture.";

	S=S+"\n\nPURPOSE:\n\n";
	S=S+"This program facilitates my computer assisted proof of he Hull Theorem from my paper.   The Hull Theorem says that a 7 vertex embedded polyhedral torus cannot have all 7 vertices in its convex hull.  This is a 1991 Theorem of Bokowski and Eggert, and my computer code gives a lighter and independent proof.";


	S=S+"GUIDE TO THE CODE:\n\n";
	    S=S+"All the computer code for the proof is contained in the two files ListHelp.java and LinkAnalyzer.java.  The main test is at the bottom, and it is run from the routine compute() at the bottom of the ControlCanvas class.   The rest of the code is for a graphical user interface that lets you see the code in action.";
	    S=S+"The Picture window displays the Moebius torus and various things that you can draw on it.  The Control Window lets you run the test and also control images in the Picture Window.  The rest of the classes are just helper classes which let me build the interface.  None of these helper classes is involved in the prof.";	

	S=S+"\n\nCONTROL WINDOW FEATURES:\n\n";
	
	S=S+"test which links?: Our main test, the Cycle Test from the paper, checks a condition at each of the 7 vertices of the Moebius torus.  However, you can turn off some of the checks using this control panel.  After you change this control panel to taste, press the `compute' button and then you will see the number of surviving patterns, namely the internal edge patterns not eliminated by the (masked) test.";

	S=S+"\n\ndisplay: You can change the colors of various things in the Picture Window. The left column of buttons controls this. You first select a color using the color selector at the bottom of the window and then click on these buttons. Just play around to see what they do.";

	S=S+"\n\nGet buttons:  When you press these buttons, the Picture window displays the internal edges and internal triangles associated to the selected internal edge pattern. These are chosen from amongst the list of surviving patterns.   If you want to see all of them, turn off all the buttons on the `links' control panel.  You can either get a random one or else use the arrow keys to go through the complete list.";

	S=S+"\n\ndebugger. This prints out various information associated to an internal edge pattern. You first have to get one using the get buttons. Then you press the debug button to see the printout. This is not part of the proof, but using the cycle test option and various links turned on and off, you can get a sense of how the code is working.";

	
	    DocumentCanvas.setText(D,S);
    }
    

}

